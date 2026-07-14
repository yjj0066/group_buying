import fs from "fs"
import path from "path"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  GroupDealDepositStatus,
  GroupDealParticipantStatus,
  GroupDealReceiptStatus,
  GroupDealStatus,
} from "../types/group-buying"

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

export const saveGroupDealReceiptImage = (input: {
  groupDealId: string
  imageBase64: string
  filename?: string
}): string => {
  const match = input.imageBase64.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  )

  if (!match) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "image_base64 must be a data URL (data:image/...;base64,...)"
    )
  }

  const mimeType = match[1]
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg"
  const buffer = Buffer.from(match[2], "base64")

  if (buffer.length > 8 * 1024 * 1024) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Receipt image must be 8MB or smaller"
    )
  }

  const receiptsDir = path.join(process.cwd(), "static", "receipts")

  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true })
  }

  const safeName =
    input.filename?.replace(/[^a-zA-Z0-9._-]/g, "_") ??
    `receipt_${input.groupDealId}`
  const storedFilename = `${Date.now()}-${safeName}.${extension}`
  const absolutePath = path.join(receiptsDir, storedFilename)

  fs.writeFileSync(absolutePath, buffer)

  return `/static/receipts/${storedFilename}`
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
      "Purchase receipt must be verified before shipping"
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
