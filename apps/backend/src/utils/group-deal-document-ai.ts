import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  GroupDealDocumentAiStatus,
  GroupDealReceiptStatus,
  GroupDealReportStage,
} from "../types/group-buying"
import {
  extractDocumentStub,
  type DocumentExtractResult,
  type StructuredInvoiceRow,
  type StructuredReceiptFields,
  validatePurchaseReceiptStub,
} from "./document-extract-stub"
import {
  getDocumentAiJobFromFlask,
  parseReceiptDocumentWithFlask,
  parseTrackingDocumentWithFlask,
  type FlaskDocumentAiJob,
} from "./flask-document-ai-client"
import {
  assertPurchaseReceiptVerified,
  markGroupDealShippingCompletedIfReady,
  saveGroupDealDocumentImage,
} from "./group-deal-leader-ops"
import {
  assertDocumentAiBffConfigured,
  getDocumentAiAutoVerifyConfidence,
  shouldUseDocumentAiStub,
} from "./hybrid-api-config"
import { serializeAccountGroupDeal } from "./group-deal-account"

export type GroupDealDocumentParseInput = {
  groupDealId: string
  customerId: string
  imageBase64: string
  filename?: string
}

export type GroupDealReceiptConfirmInput = {
  groupDealId: string
  customerId: string
  order_number: string
  seller?: string | null
  ordered_at?: string | null
  album_quantity: number
  total_amount?: number | null
}

export type GroupDealDocumentParseResult = {
  group_deal: ReturnType<typeof serializeAccountGroupDeal>
  document_ai: {
    job_id: string | null
    status: GroupDealDocumentAiStatus
    confidence: number | null
    needs_review: boolean
    structured_receipt?: StructuredReceiptFields | null
    invoice_rows?: StructuredInvoiceRow[] | null
    validation?: { passed: boolean; reasons: string[] }
    auto_matched_participant_ids?: string[]
    review_conflicts?: Array<Record<string, unknown>>
  }
}

const COMPLETED_JOB_STATUSES = new Set([
  "completed",
  "succeeded",
  "done",
  "parsed",
])

const FAILED_JOB_STATUSES = new Set(["failed", "error", "cancelled"])

export const assertGroupDealLeader = async (
  scope: MedusaContainer,
  groupDealId: string,
  customerId: string
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)
  const deal = await groupBuyingService.retrieveGroupDeal(groupDealId)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the deal leader can run document AI for this group deal"
    )
  }

  return deal
}

export const mapFlaskJobToDocumentAiStatus = (
  job: FlaskDocumentAiJob
): GroupDealDocumentAiStatus => {
  const status = String(job.status ?? "").toLowerCase()

  if (FAILED_JOB_STATUSES.has(status)) {
    return GroupDealDocumentAiStatus.FAILED
  }

  if (!COMPLETED_JOB_STATUSES.has(status)) {
    return GroupDealDocumentAiStatus.PROCESSING
  }

  if (job.needs_review) {
    return GroupDealDocumentAiStatus.NEEDS_REVIEW
  }

  const confidence = job.confidence ?? null

  if (
    confidence != null &&
    confidence < getDocumentAiAutoVerifyConfidence()
  ) {
    return GroupDealDocumentAiStatus.NEEDS_REVIEW
  }

  return GroupDealDocumentAiStatus.PARSED
}

const readNumber = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : null
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

export const mapFlaskExtractToStructuredReceipt = (
  job: FlaskDocumentAiJob
): StructuredReceiptFields | null => {
  const extract =
    (job.extract_result_json as Record<string, unknown> | null) ??
    (job.parse_result_json as Record<string, unknown> | null)

  if (!extract) {
    return null
  }

  const nested =
    (extract.receipt_fields as Record<string, unknown> | undefined) ??
    (extract.fields as Record<string, unknown> | undefined) ??
    extract

  const confidence =
    readNumber(nested.confidence) ??
    readNumber(job.confidence) ??
    0

  return {
    seller:
      readString(nested.seller) ??
      readString(nested.store_name) ??
      readString(nested.merchant_name),
    order_number:
      readString(nested.order_number) ??
      readString(nested.order_id) ??
      readString(nested.order_no),
    ordered_at:
      readString(nested.ordered_at) ??
      readString(nested.order_date) ??
      readString(nested.purchased_at),
    album_quantity:
      readNumber(nested.album_quantity) ??
      readNumber(nested.quantity) ??
      readNumber(nested.item_quantity),
    total_amount:
      readNumber(nested.total_amount) ??
      readNumber(nested.amount) ??
      readNumber(nested.total_price),
    confidence,
  }
}

export const mapFlaskExtractToInvoiceRows = (
  job: FlaskDocumentAiJob
): StructuredInvoiceRow[] => {
  const extract =
    (job.extract_result_json as Record<string, unknown> | null) ??
    (job.parse_result_json as Record<string, unknown> | null)

  if (!extract) {
    return []
  }

  const rowsSource =
    (extract.invoice_rows as unknown[]) ??
    (extract.tracking_rows as unknown[]) ??
    (extract.rows as unknown[]) ??
    []

  return rowsSource
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null
      }

      const record = row as Record<string, unknown>
      const confidence =
        readNumber(record.confidence) ??
        readNumber(job.confidence) ??
        0

      return {
        recipient_name:
          readString(record.recipient_name) ??
          readString(record.receiver_name) ??
          readString(record.name),
        carrier:
          readString(record.carrier) ??
          readString(record.courier) ??
          readString(record.shipping_company),
        tracking_number:
          readString(record.tracking_number) ??
          readString(record.invoice_number) ??
          readString(record.waybill_number),
        address_hint:
          readString(record.address_hint) ??
          readString(record.address) ??
          readString(record.delivery_address),
        confidence,
        needs_review: Boolean(record.needs_review ?? confidence < 0.85),
      } satisfies StructuredInvoiceRow
    })
    .filter((row): row is StructuredInvoiceRow => row != null)
}

const mapStubResultToReceipt = (
  result: DocumentExtractResult
): StructuredReceiptFields | null => result.receipt_fields ?? null

const mapStubResultToInvoiceRows = (
  result: DocumentExtractResult
): StructuredInvoiceRow[] => result.invoice_rows ?? []

const buildReceiptStubJob = (input: {
  groupDealId: string
  imageUrl: string
  declaredAlbumQuantity: number
  primarySeller: string | null
}): {
  job: FlaskDocumentAiJob
  structuredReceipt: StructuredReceiptFields | null
} => {
  const stub = extractDocumentStub({
    kind: "purchase_receipt",
    image_url: input.imageUrl,
    declared_album_quantity: input.declaredAlbumQuantity,
    primary_seller: input.primarySeller,
  })

  const structuredReceipt = mapStubResultToReceipt(stub)

  return {
    structuredReceipt,
    job: {
      id: `stub-receipt-${input.groupDealId}`,
      job_type: "receipt_parse",
      status: "completed",
      confidence: structuredReceipt?.confidence ?? null,
      needs_review: stub.requires_confirmation,
    },
  }
}

const buildTrackingStubJob = (input: {
  groupDealId: string
  imageUrl: string
}): {
  job: FlaskDocumentAiJob
  invoiceRows: StructuredInvoiceRow[]
} => {
  const stub = extractDocumentStub({
    kind: "shipping_invoice",
    image_url: input.imageUrl,
  })

  const invoiceRows = mapStubResultToInvoiceRows(stub)

  return {
    invoiceRows,
    job: {
      id: `stub-tracking-${input.groupDealId}`,
      job_type: "tracking_parse",
      status: "completed",
      confidence: invoiceRows[0]?.confidence ?? null,
      needs_review: stub.requires_confirmation,
    },
  }
}

export const buildDocumentAiResultPayload = (input: {
  job: FlaskDocumentAiJob | null
  structuredReceipt?: StructuredReceiptFields | null
  invoiceRows?: StructuredInvoiceRow[] | null
  validation?: { passed: boolean; reasons: string[] }
  autoMatchedParticipantIds?: string[]
  reviewConflicts?: Array<Record<string, unknown>>
  source: "flask" | "stub" | "manual"
}) => ({
  source: input.source,
  job_id: input.job?.id ?? null,
  job_status: input.job?.status ?? null,
  review_reason: input.job?.review_reason ?? null,
  masked_output_url: input.job?.masked_output_url ?? null,
  structured_receipt: input.structuredReceipt ?? null,
  invoice_rows: input.invoiceRows ?? null,
  validation: input.validation ?? null,
  auto_matched_participant_ids: input.autoMatchedParticipantIds ?? [],
  review_conflicts: input.reviewConflicts ?? [],
})

const normalizeName = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  return value.trim().toLowerCase().replace(/\s+/g, "")
}

const normalizeAddress = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  return value.trim().toLowerCase().replace(/\s+/g, "")
}

const scoreNameMatch = (
  recipientName: string | null | undefined,
  participantName: string | null | undefined
): number => {
  const recipient = normalizeName(recipientName)
  const participant = normalizeName(participantName)

  if (!recipient || !participant) {
    return 0
  }

  if (recipient === participant) {
    return 100
  }

  if (recipient.includes(participant) || participant.includes(recipient)) {
    return 80
  }

  return 0
}

const scoreAddressMatch = (
  addressHint: string | null | undefined,
  participantAddress: string | null | undefined
): number => {
  const hint = normalizeAddress(addressHint)
  const address = normalizeAddress(participantAddress)

  if (!hint || !address) {
    return 0
  }

  if (address.includes(hint) || hint.includes(address)) {
    return 80
  }

  const hintPostal = hint.match(/\d{5}/)?.[0] ?? null
  const addressPostal = address.match(/\d{5}/)?.[0] ?? null

  if (hintPostal && addressPostal && hintPostal === addressPostal) {
    return 60
  }

  return 0
}

const formatParticipantRecipientName = (address: {
  first_name?: string | null
  last_name?: string | null
} | null | undefined): string | null => {
  if (!address) {
    return null
  }

  const name = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || null
}

const formatParticipantAddressLine = (address: {
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
} | null | undefined): string | null => {
  if (!address) {
    return null
  }

  const line = [
    address.postal_code,
    address.address_1,
    address.address_2,
    address.city,
    address.province,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  return line || null
}

const resolveInvoiceRowParticipantMatches = (
  row: StructuredInvoiceRow,
  participants: Array<{
    id: string
    recipient_name: string | null
    address_line: string | null
  }>
): string[] => {
  const nameCandidates = participants.filter(
    (participant) =>
      scoreNameMatch(row.recipient_name, participant.recipient_name) >= 80
  )

  if (nameCandidates.length === 0) {
    return []
  }

  if (nameCandidates.length === 1) {
    return [nameCandidates[0].id]
  }

  const addressHint = row.address_hint?.trim()

  if (addressHint) {
    const addressMatches = nameCandidates.filter(
      (participant) =>
        scoreAddressMatch(addressHint, participant.address_line) > 0
    )

    if (addressMatches.length === 1) {
      return [addressMatches[0].id]
    }

    if (addressMatches.length > 1) {
      return addressMatches.map((participant) => participant.id)
    }
  }

  return nameCandidates.map((participant) => participant.id)
}

const matchParticipantsToInvoiceRows = async (
  scope: MedusaContainer,
  groupDealId: string,
  rows: StructuredInvoiceRow[]
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: groupDealId,
  })

  const orderIds = participants
    .map((participant) => participant.order_id)
    .filter((orderId): orderId is string => Boolean(orderId))

  const ordersById = new Map<string, Record<string, unknown>>()

  if (orderIds.length) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
      ],
      filters: { id: orderIds },
    })

    for (const order of orders ?? []) {
      if (order?.id) {
        ordersById.set(String(order.id), order as Record<string, unknown>)
      }
    }
  }

  const participantProfiles = participants.map((participant) => {
    const order = participant.order_id
      ? ordersById.get(participant.order_id)
      : undefined
    const shippingAddress = (order?.shipping_address ?? null) as
      | Record<string, string | null>
      | null

    return {
      id: participant.id,
      recipient_name: formatParticipantRecipientName(shippingAddress),
      address_line: formatParticipantAddressLine(shippingAddress),
    }
  })

  const autoMatchedParticipantIds: string[] = []
  const reviewConflicts: Array<Record<string, unknown>> = []
  const entries: Array<{
    participant_id: string
    tracking_number: string
    carrier?: string | null
  }> = []

  for (const row of rows) {
    if (!row.tracking_number) {
      reviewConflicts.push({
        reason: "TRACKING_NUMBER_MISSING",
        row,
      })
      continue
    }

    const matches = resolveInvoiceRowParticipantMatches(row, participantProfiles)

    if (matches.length !== 1) {
      reviewConflicts.push({
        reason: matches.length > 1 ? "MULTIPLE_MATCHES" : "NO_MATCH",
        row,
        candidate_participant_ids: matches,
      })
      continue
    }

    const participantId = matches[0]

    entries.push({
      participant_id: participantId,
      tracking_number: row.tracking_number,
      carrier: row.carrier,
    })
    autoMatchedParticipantIds.push(participantId)
  }

  if (entries.length) {
    await groupBuyingService.bulkUpdateParticipantTracking({
      group_deal_id: groupDealId,
      entries,
    })

    await markGroupDealShippingCompletedIfReady(scope, groupDealId)
  }

  return { autoMatchedParticipantIds, reviewConflicts }
}

export const processGroupDealReceiptParse = async (
  scope: MedusaContainer,
  input: GroupDealDocumentParseInput
): Promise<GroupDealDocumentParseResult> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await assertGroupDealLeader(
    scope,
    input.groupDealId,
    input.customerId
  )
  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    receipt_ai_status: GroupDealDocumentAiStatus.PROCESSING,
  })

  const imageUrl = await saveGroupDealDocumentImage({
    groupDealId: input.groupDealId,
    imageBase64: input.imageBase64,
    filename: input.filename,
    folder: "receipts",
    prefix: "receipt",
  })

  let job: FlaskDocumentAiJob | null = null
  let structuredReceipt: StructuredReceiptFields | null = null
  let source: "flask" | "stub" = "stub"
  const declaredAlbumQuantity =
    metadata.declared_album_quantity != null
      ? Number(metadata.declared_album_quantity)
      : Number(deal.target_quantity ?? 0)
  const primarySeller =
    metadata.primary_seller != null ? String(metadata.primary_seller) : null

  try {
    assertDocumentAiBffConfigured()

    if (shouldUseDocumentAiStub()) {
      const stubResult = buildReceiptStubJob({
        groupDealId: input.groupDealId,
        imageUrl,
        declaredAlbumQuantity,
        primarySeller,
      })

      job = stubResult.job
      structuredReceipt = stubResult.structuredReceipt
      source = "stub"
    } else {
      const response = await parseReceiptDocumentWithFlask({
        partner_group_deal_id: input.groupDealId,
        stored_document_url: imageUrl,
        input_file_name: input.filename,
        input_payload_json: {
          declared_album_quantity: declaredAlbumQuantity,
          primary_seller: primarySeller,
        },
      })

      job = response.job
      structuredReceipt = mapFlaskExtractToStructuredReceipt(job)
      source = "flask"
    }
  } catch (error) {
    await groupBuyingService.updatePurchaseReceipt({
      group_deal_id: input.groupDealId,
      receipt_url: imageUrl,
      status: GroupDealReceiptStatus.UPLOADED,
    })

    await groupBuyingService.updateGroupDeals({
      id: input.groupDealId,
      receipt_ai_status: GroupDealDocumentAiStatus.FAILED,
      receipt_ai_result: {
        source,
        error_message:
          error instanceof Error ? error.message : "Receipt parse failed",
      },
    })

    throw error
  }

  const aiStatus = mapFlaskJobToDocumentAiStatus(job)
  const confidence =
    structuredReceipt?.confidence ??
    readNumber(job.confidence)

  const validation = structuredReceipt
    ? validatePurchaseReceiptStub({
        structured: structuredReceipt,
        declared_album_quantity:
          metadata.declared_album_quantity != null
            ? Number(metadata.declared_album_quantity)
            : Number(deal.target_quantity ?? 0),
        primary_seller:
          metadata.primary_seller != null
            ? String(metadata.primary_seller)
            : null,
        all_participants_paid_at: null,
      })
    : { passed: false, reasons: ["STRUCTURED_RECEIPT_MISSING"] }

  const nextReceiptStatus =
    validation.passed && aiStatus === GroupDealDocumentAiStatus.PARSED
      ? GroupDealReceiptStatus.VERIFIED
      : GroupDealReceiptStatus.UPLOADED

  const nextReportStage =
    aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW ||
    aiStatus === GroupDealDocumentAiStatus.FAILED
      ? GroupDealReportStage.RECEIPT_REVIEW
      : validation.passed
        ? GroupDealReportStage.SHIPPING
        : GroupDealReportStage.RECEIPT_REVIEW

  await groupBuyingService.updatePurchaseReceipt({
    group_deal_id: input.groupDealId,
    receipt_url: imageUrl,
    status: nextReceiptStatus,
  })

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    receipt_ai_status: aiStatus,
    receipt_ai_confidence: confidence,
    receipt_ai_job_id: job.id,
    receipt_ai_result: buildDocumentAiResultPayload({
      job,
      structuredReceipt,
      validation,
      source,
    }),
    report_stage: nextReportStage,
    metadata: {
      ...(deal.metadata ?? {}),
      purchase_receipt_structured: structuredReceipt,
    },
  })

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(input.groupDealId)

  return {
    group_deal: serializeAccountGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    document_ai: {
      job_id: job.id,
      status: aiStatus,
      confidence,
      needs_review: aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW,
      structured_receipt: structuredReceipt,
      validation,
    },
  }
}

export const processGroupDealReceiptConfirm = async (
  scope: MedusaContainer,
  input: GroupDealReceiptConfirmInput
): Promise<GroupDealDocumentParseResult> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await assertGroupDealLeader(
    scope,
    input.groupDealId,
    input.customerId
  )

  if (!deal.purchase_receipt_url) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Upload a receipt image before confirming receipt details"
    )
  }

  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
  const declaredAlbumQuantity =
    metadata.declared_album_quantity != null
      ? Number(metadata.declared_album_quantity)
      : Number(deal.target_quantity ?? 0)
  const primarySeller =
    metadata.primary_seller != null ? String(metadata.primary_seller) : null

  const structuredReceipt: StructuredReceiptFields = {
    seller: input.seller?.trim() ? input.seller.trim() : null,
    order_number: input.order_number.trim(),
    ordered_at: input.ordered_at?.trim() ? input.ordered_at.trim() : null,
    album_quantity: input.album_quantity,
    total_amount: input.total_amount ?? null,
    confidence: 1,
  }

  const validation = validatePurchaseReceiptStub({
    structured: structuredReceipt,
    declared_album_quantity: declaredAlbumQuantity,
    primary_seller: primarySeller,
    all_participants_paid_at: null,
  })

  const aiStatus = validation.passed
    ? GroupDealDocumentAiStatus.PARSED
    : GroupDealDocumentAiStatus.NEEDS_REVIEW

  const nextReceiptStatus = validation.passed
    ? GroupDealReceiptStatus.VERIFIED
    : GroupDealReceiptStatus.UPLOADED

  const nextReportStage = validation.passed
    ? GroupDealReportStage.SHIPPING
    : GroupDealReportStage.RECEIPT_REVIEW

  await groupBuyingService.updatePurchaseReceipt({
    group_deal_id: input.groupDealId,
    status: nextReceiptStatus,
  })

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    receipt_ai_status: aiStatus,
    receipt_ai_confidence: structuredReceipt.confidence,
    receipt_ai_result: buildDocumentAiResultPayload({
      job: null,
      structuredReceipt,
      validation,
      source: "manual",
    }),
    report_stage: nextReportStage,
    metadata: {
      ...(deal.metadata ?? {}),
      purchase_receipt_structured: structuredReceipt,
    },
  })

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(input.groupDealId)

  return {
    group_deal: serializeAccountGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    document_ai: {
      job_id: null,
      status: aiStatus,
      confidence: structuredReceipt.confidence,
      needs_review: aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW,
      structured_receipt: structuredReceipt,
      validation,
    },
  }
}

export const processGroupDealTrackingParse = async (
  scope: MedusaContainer,
  input: GroupDealDocumentParseInput
): Promise<GroupDealDocumentParseResult> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  await assertGroupDealLeader(scope, input.groupDealId, input.customerId)
  await assertPurchaseReceiptVerified(scope, input.groupDealId)

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    tracking_ai_status: GroupDealDocumentAiStatus.PROCESSING,
  })

  const imageUrl = await saveGroupDealDocumentImage({
    groupDealId: input.groupDealId,
    imageBase64: input.imageBase64,
    filename: input.filename,
    folder: "tracking",
    prefix: "tracking",
  })

  let job: FlaskDocumentAiJob | null = null
  let invoiceRows: StructuredInvoiceRow[] = []
  let source: "flask" | "stub" = "stub"

  try {
    assertDocumentAiBffConfigured()

    if (shouldUseDocumentAiStub()) {
      const stubResult = buildTrackingStubJob({
        groupDealId: input.groupDealId,
        imageUrl,
      })

      job = stubResult.job
      invoiceRows = stubResult.invoiceRows
      source = "stub"
    } else {
      const response = await parseTrackingDocumentWithFlask({
        partner_group_deal_id: input.groupDealId,
        stored_document_url: imageUrl,
        input_file_name: input.filename,
      })

      job = response.job
      invoiceRows = mapFlaskExtractToInvoiceRows(job)
      source = "flask"
    }
  } catch (error) {
    await groupBuyingService.updateGroupDeals({
      id: input.groupDealId,
      tracking_ai_status: GroupDealDocumentAiStatus.FAILED,
      tracking_ai_result: {
        source,
        error_message:
          error instanceof Error ? error.message : "Tracking parse failed",
      },
    })

    throw error
  }

  const aiStatus = mapFlaskJobToDocumentAiStatus(job)
  const confidence =
    readNumber(job.confidence) ??
    invoiceRows.reduce<number | null>((best, row) => {
      if (best == null || row.confidence > best) {
        return row.confidence
      }

      return best
    }, null)

  const { autoMatchedParticipantIds, reviewConflicts } =
    await matchParticipantsToInvoiceRows(scope, input.groupDealId, invoiceRows).catch(
      (error) => ({
        autoMatchedParticipantIds: [] as string[],
        reviewConflicts: [
          {
            reason: "AUTO_MATCH_FAILED",
            error_message:
              error instanceof Error ? error.message : "Participant auto-match failed",
          },
        ],
      })
    )

  const nextReportStage =
    reviewConflicts.length || aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW
      ? GroupDealReportStage.SHIPPING
      : autoMatchedParticipantIds.length
        ? GroupDealReportStage.SETTLEMENT_READY
        : GroupDealReportStage.SHIPPING

  await groupBuyingService.updateGroupDeals({
    id: input.groupDealId,
    tracking_ai_status: aiStatus,
    tracking_ai_confidence: confidence,
    tracking_ai_job_id: job.id,
    tracking_ai_result: buildDocumentAiResultPayload({
      job,
      invoiceRows,
      autoMatchedParticipantIds,
      reviewConflicts,
      source,
    }),
    report_stage: nextReportStage,
  })

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(input.groupDealId)

  return {
    group_deal: serializeAccountGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    document_ai: {
      job_id: job.id,
      status: aiStatus,
      confidence,
      needs_review: aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW,
      invoice_rows: invoiceRows,
      auto_matched_participant_ids: autoMatchedParticipantIds,
      review_conflicts: reviewConflicts,
    },
  }
}

export const getGroupDealDocumentAiJob = async (
  scope: MedusaContainer,
  input: {
    groupDealId: string
    customerId: string
    jobId: string
  }
) => {
  await assertGroupDealLeader(scope, input.groupDealId, input.customerId)

  const response = await getDocumentAiJobFromFlask(input.jobId)

  return response.job
}
