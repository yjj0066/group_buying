import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  GroupDealDepositStatus,
  GroupDealParticipantStatus,
  GroupDealReceiptStatus,
  GroupDealStatus,
} from "../types/group-buying"
import { emitGroupDealUpdated } from "../workflows/group-deal-billing"
import {
  formatGroupDealDocumentMaxUploadLabel,
  GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES,
} from "./group-deal-document-upload"
import { buildPurchaseReceiptShippingBlockMessage } from "./purchase-receipt-guard-message"
import {
  parseGroupDealMediaBase64,
  storeGroupDealMedia,
} from "./group-deal-media-storage"

const PAID_PARTICIPANT_STATUSES = [
  GroupDealParticipantStatus.CONFIRMED,
  GroupDealParticipantStatus.RESERVED,
]

type AddressLike = {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

export type GroupDealPackingSlipRow = {
  participant_id: string
  email: string
  customer_id: string | null
  quantity: number
  status: GroupDealParticipantStatus
  order_id: string | null
  recipient_name: string | null
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
  tracking_number: string | null
  carrier: string | null
  option_summary: string | null
}

export type GroupDealPackingSlip = {
  group_deal_id: string
  title: string
  generated_at: string
  total_rows: number
  rows: GroupDealPackingSlipRow[]
}

const formatRecipientName = (address?: AddressLike | null): string | null => {
  if (!address) {
    return null
  }

  const name = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || null
}

export const saveGroupDealReceiptImage = async (input: {
  groupDealId: string
  imageBase64: string
  filename?: string
}): Promise<string> => {
  return saveGroupDealDocumentImage({
    groupDealId: input.groupDealId,
    imageBase64: input.imageBase64,
    filename: input.filename,
    folder: "receipts",
    prefix: "receipt",
  })
}

export const saveGroupDealCoverImage = async (input: {
  groupDealId: string
  imageBase64: string
  filename?: string
}): Promise<string> => {
  return saveGroupDealDocumentImage({
    groupDealId: input.groupDealId,
    imageBase64: input.imageBase64,
    filename: input.filename,
    folder: "deal-images",
    prefix: "cover",
  })
}

export const saveGroupDealDocumentImage = async (input: {
  groupDealId: string
  imageBase64: string
  filename?: string
  folder: "receipts" | "tracking" | "deal-images"
  prefix: string
}): Promise<string> => {
  const { mimeType, buffer } = parseGroupDealMediaBase64(input.imageBase64)

  if (buffer.length > GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Document image must be ${formatGroupDealDocumentMaxUploadLabel()} or smaller`
    )
  }

  return storeGroupDealMedia({
    buffer,
    folder: input.folder,
    filename: input.filename,
    fallbackName: `${input.prefix}_${input.groupDealId}`,
    mimeType,
  })
}

export const assertAllParticipantsPaid = async (
  scope: MedusaContainer,
  groupDealId: string
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: groupDealId,
  })

  const activeParticipants = participants.filter(
    (participant) =>
      participant.status !== GroupDealParticipantStatus.CANCELLED &&
      participant.status !== GroupDealParticipantStatus.CAPTURE_FAILED
  )

  if (!activeParticipants.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "No active participants found for this group deal"
    )
  }

  const unpaid = activeParticipants.filter(
    (participant) =>
      !PAID_PARTICIPANT_STATUSES.includes(
        participant.status as GroupDealParticipantStatus
      )
  )

  if (unpaid.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${unpaid.length} participant(s) have not completed payment yet`
    )
  }

  return activeParticipants
}

export const markGroupDealShippingCompletedIfReady = async (
  scope: MedusaContainer,
  groupDealId: string
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await groupBuyingService.retrieveGroupDeal(groupDealId)
  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

  if (metadata.shipping_completed_at) {
    return false
  }

  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: groupDealId,
  })

  const activeParticipants = participants.filter(
    (participant) =>
      participant.status !== GroupDealParticipantStatus.CANCELLED &&
      participant.status !== GroupDealParticipantStatus.CAPTURE_FAILED
  )

  if (!activeParticipants.length) {
    return false
  }

  const allHaveTracking = activeParticipants.every((participant) =>
    Boolean(participant.tracking_number?.trim())
  )

  if (!allHaveTracking) {
    return false
  }

  await groupBuyingService.updateGroupDeals({
    id: groupDealId,
    metadata: {
      ...metadata,
      opening_status: "completed",
      shipping_completed_at: new Date().toISOString(),
    },
  })

  return true
}

export const assertPurchaseReceiptVerified = async (
  scope: MedusaContainer,
  groupDealId: string
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await groupBuyingService.retrieveGroupDeal(groupDealId)

  if (deal.purchase_receipt_status !== GroupDealReceiptStatus.VERIFIED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      buildPurchaseReceiptShippingBlockMessage({
        purchase_receipt_status: deal.purchase_receipt_status,
        purchase_receipt_url: deal.purchase_receipt_url,
        receipt_ai_status: deal.receipt_ai_status,
        receipt_ai_confidence: deal.receipt_ai_confidence,
        receipt_ai_result: deal.receipt_ai_result,
      })
    )
  }

  return deal
}

export const buildGroupDealPackingSlip = async (
  scope: MedusaContainer,
  groupDealId: string
): Promise<GroupDealPackingSlip> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const deal = await assertPurchaseReceiptVerified(scope, groupDealId)
  const participants = await assertAllParticipantsPaid(scope, groupDealId)

  const orderIds = participants
    .map((participant) => participant.order_id)
    .filter((orderId): orderId is string => Boolean(orderId))

  const ordersById = new Map<string, Record<string, unknown>>()

  if (orderIds.length) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.phone",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
        "shipping_address.country_code",
      ],
      filters: { id: orderIds },
    })

    for (const order of orders ?? []) {
      if (order?.id) {
        ordersById.set(String(order.id), order as Record<string, unknown>)
      }
    }
  }

  const rows: GroupDealPackingSlipRow[] = []

  for (const participant of participants) {
    const selections = await groupBuyingService.listParticipantSelections(
      participant.id
    )
    const optionSummary = selections.length
      ? selections
          .map((selection) => `${selection.option_id} x${selection.quantity}`)
          .join(", ")
      : null

    const order = participant.order_id
      ? ordersById.get(participant.order_id)
      : undefined
    const shippingAddress = (order?.shipping_address ?? null) as AddressLike | null

    rows.push({
      participant_id: participant.id,
      email: participant.email,
      customer_id: participant.customer_id,
      quantity: participant.quantity,
      status: participant.status as GroupDealParticipantStatus,
      order_id: participant.order_id,
      recipient_name: formatRecipientName(shippingAddress),
      phone: shippingAddress?.phone ?? null,
      address_line_1: shippingAddress?.address_1 ?? null,
      address_line_2: shippingAddress?.address_2 ?? null,
      city: shippingAddress?.city ?? null,
      province: shippingAddress?.province ?? null,
      postal_code: shippingAddress?.postal_code ?? null,
      country_code: shippingAddress?.country_code ?? null,
      tracking_number: participant.tracking_number ?? null,
      carrier: participant.carrier ?? null,
      option_summary: optionSummary,
    })
  }

  return {
    group_deal_id: deal.id,
    title: deal.title,
    generated_at: new Date().toISOString(),
    total_rows: rows.length,
    rows,
  }
}

export const packingSlipToCsv = (packingSlip: GroupDealPackingSlip): string => {
  const headers = [
    "participant_id",
    "email",
    "quantity",
    "recipient_name",
    "phone",
    "address_line_1",
    "address_line_2",
    "city",
    "province",
    "postal_code",
    "country_code",
    "tracking_number",
    "carrier",
    "option_summary",
  ]

  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value)

    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }

    return text
  }

  const lines = [
    headers.join(","),
    ...packingSlip.rows.map((row) =>
      [
        row.participant_id,
        row.email,
        row.quantity,
        row.recipient_name,
        row.phone,
        row.address_line_1,
        row.address_line_2,
        row.city,
        row.province,
        row.postal_code,
        row.country_code,
        row.tracking_number,
        row.carrier,
        row.option_summary,
      ]
        .map(escape)
        .join(",")
    ),
  ]

  return `\uFEFF${lines.join("\n")}`
}

export const isParticipantAddressComplete = (
  row: Pick<
    GroupDealPackingSlipRow,
    "address_line_1" | "city" | "postal_code" | "country_code"
  >
): boolean => {
  return Boolean(
    row.address_line_1?.trim() &&
      row.city?.trim() &&
      row.postal_code?.trim() &&
      row.country_code?.trim()
  )
}

export const isParticipantPaid = (status: string): boolean => {
  return PAID_PARTICIPANT_STATUSES.includes(status as GroupDealParticipantStatus)
}

export const resolveReceiptStatusLabel = (
  status: GroupDealReceiptStatus | string
): string => {
  switch (status) {
    case GroupDealReceiptStatus.VERIFIED:
      return "Verified"
    case GroupDealReceiptStatus.UPLOADED:
      return "Uploaded"
    case GroupDealReceiptStatus.REJECTED:
      return "Rejected"
    default:
      return "Pending"
  }
}

export type GroupDealShippingCompleteInput = {
  groupDealId: string
  customerId: string
  entries: Array<{
    participant_id: string
    carrier: string
    tracking_number: string
  }>
}

export type GroupDealShippingCompleteResult = {
  updated_count: number
  notified_count: number
  updated_participant_ids: string[]
}

const emitGroupDealParticipantShippingRegistered = async (
  scope: MedusaContainer,
  input: {
    group_deal_id: string
    participant_id: string
    email: string
    tracking_number: string
    carrier: string | null
  }
) => {
  try {
    const eventBus = scope.resolve(Modules.EVENT_BUS) as {
      emit: (event: {
        name: string
        data: Record<string, unknown>
      }) => Promise<void>
    }

    await eventBus.emit({
      name: "group_deal.participant_shipping_registered",
      data: {
        group_deal_id: input.group_deal_id,
        participant_id: input.participant_id,
        email: input.email,
        tracking_number: input.tracking_number,
        carrier: input.carrier,
        notified_at: new Date().toISOString(),
      },
    })
  } catch {
    // Event bus may be unavailable in isolated tests.
  }
}

export const processGroupDealShippingComplete = async (
  scope: MedusaContainer,
  input: GroupDealShippingCompleteInput
): Promise<GroupDealShippingCompleteResult> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await groupBuyingService.retrieveGroupDeal(input.groupDealId)

  if (String(deal.leader_customer_id ?? "") !== input.customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the deal leader can complete shipping for this group deal"
    )
  }

  await assertPurchaseReceiptVerified(scope, input.groupDealId)

  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: input.groupDealId,
  })
  const activeParticipants = participants.filter(
    (participant) =>
      participant.status !== GroupDealParticipantStatus.CANCELLED &&
      participant.status !== GroupDealParticipantStatus.CAPTURE_FAILED
  )
  const participantsById = new Map(
    activeParticipants.map((participant) => [participant.id, participant])
  )

  if (!input.entries.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "등록할 운송장 정보가 없습니다."
    )
  }

  for (const entry of input.entries) {
    if (!participantsById.has(entry.participant_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Participant ${entry.participant_id} does not belong to this group deal`
      )
    }
  }

  const updatedParticipantIds =
    await groupBuyingService.bulkUpdateParticipantTracking({
      group_deal_id: input.groupDealId,
      entries: input.entries,
    })

  let notifiedCount = 0

  for (const participantId of updatedParticipantIds) {
    const participant = participantsById.get(participantId)

    if (!participant?.email) {
      continue
    }

    const entry = input.entries.find(
      (item) => item.participant_id === participantId
    )

    if (!entry) {
      continue
    }

    await emitGroupDealParticipantShippingRegistered(scope, {
      group_deal_id: input.groupDealId,
      participant_id: participantId,
      email: participant.email,
      tracking_number: entry.tracking_number.trim(),
      carrier: entry.carrier.trim(),
    })

    notifiedCount += 1
  }

  const dealMetadata = (deal.metadata as Record<string, unknown> | null) ?? {}

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    metadata: {
      ...dealMetadata,
      opening_status: "completed",
      shipping_completed_at: new Date().toISOString(),
    },
  })

  await emitGroupDealUpdated(scope, input.groupDealId)

  return {
    updated_count: updatedParticipantIds.length,
    notified_count: notifiedCount,
    updated_participant_ids: updatedParticipantIds,
  }
}
