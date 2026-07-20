import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

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
  saveGroupDealDocumentImage,
} from "./group-deal-leader-ops"
import {
  buildPublicStaticUrl,
  getDocumentAiAutoVerifyConfidence,
  isDocumentAiEnabled,
} from "./hybrid-api-config"
import { serializeAccountGroupDeal } from "./group-deal-account"

export type GroupDealDocumentParseInput = {
  groupDealId: string
  customerId: string
  imageBase64: string
  filename?: string
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

export const buildDocumentAiResultPayload = (input: {
  job: FlaskDocumentAiJob | null
  structuredReceipt?: StructuredReceiptFields | null
  invoiceRows?: StructuredInvoiceRow[] | null
  validation?: { passed: boolean; reasons: string[] }
  autoMatchedParticipantIds?: string[]
  reviewConflicts?: Array<Record<string, unknown>>
  source: "flask" | "stub"
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

const matchParticipantsToInvoiceRows = async (
  scope: MedusaContainer,
  groupDealId: string,
  rows: StructuredInvoiceRow[]
) => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)
  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: groupDealId,
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

    const normalizedRecipient = normalizeName(row.recipient_name)
    const matches = participants.filter((participant) => {
      const emailPrefix = normalizeName(participant.email.split("@")[0])
      return (
        normalizedRecipient &&
        emailPrefix &&
        (normalizedRecipient.includes(emailPrefix) ||
          emailPrefix.includes(normalizedRecipient))
      )
    })

    if (matches.length !== 1) {
      reviewConflicts.push({
        reason: matches.length > 1 ? "MULTIPLE_MATCHES" : "NO_MATCH",
        row,
        candidate_participant_ids: matches.map((item) => item.id),
      })
      continue
    }

    const participant = matches[0]

    entries.push({
      participant_id: participant.id,
      tracking_number: row.tracking_number,
      carrier: row.carrier,
    })
    autoMatchedParticipantIds.push(participant.id)
  }

  if (entries.length) {
    await groupBuyingService.bulkUpdateParticipantTracking({
      group_deal_id: groupDealId,
      entries,
    })
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

  const imageUrl = saveGroupDealDocumentImage({
    groupDealId: input.groupDealId,
    imageBase64: input.imageBase64,
    filename: input.filename,
    folder: "receipts",
    prefix: "receipt",
  })

  let job: FlaskDocumentAiJob | null = null
  let structuredReceipt: StructuredReceiptFields | null = null
  let source: "flask" | "stub" = "stub"

  try {
    if (isDocumentAiEnabled()) {
      const response = await parseReceiptDocumentWithFlask({
        partner_group_deal_id: input.groupDealId,
        input_url: buildPublicStaticUrl(imageUrl),
        input_base64: input.imageBase64,
        input_file_name: input.filename,
        input_payload_json: {
          declared_album_quantity:
            metadata.declared_album_quantity != null
              ? Number(metadata.declared_album_quantity)
              : Number(deal.target_quantity ?? 0),
          primary_seller:
            metadata.primary_seller != null
              ? String(metadata.primary_seller)
              : null,
        },
      })

      job = response.job
      structuredReceipt = mapFlaskExtractToStructuredReceipt(job)
      source = "flask"
    } else {
      const stub = extractDocumentStub({
        kind: "purchase_receipt",
        image_url: imageUrl,
        declared_album_quantity:
          metadata.declared_album_quantity != null
            ? Number(metadata.declared_album_quantity)
            : Number(deal.target_quantity ?? 0),
        primary_seller:
          metadata.primary_seller != null
            ? String(metadata.primary_seller)
            : null,
      })

      structuredReceipt = mapStubResultToReceipt(stub)
      job = {
        id: `stub-receipt-${input.groupDealId}`,
        job_type: "receipt_parse",
        status: "completed",
        confidence: structuredReceipt?.confidence ?? null,
        needs_review: stub.requires_confirmation,
      }
    }
  } catch (error) {
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

  const imageUrl = saveGroupDealDocumentImage({
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
    if (isDocumentAiEnabled()) {
      const response = await parseTrackingDocumentWithFlask({
        partner_group_deal_id: input.groupDealId,
        input_url: buildPublicStaticUrl(imageUrl),
        input_base64: input.imageBase64,
        input_file_name: input.filename,
      })

      job = response.job
      invoiceRows = mapFlaskExtractToInvoiceRows(job)
      source = "flask"
    } else {
      const stub = extractDocumentStub({
        kind: "shipping_invoice",
        image_url: imageUrl,
      })

      invoiceRows = mapStubResultToInvoiceRows(stub)
      job = {
        id: `stub-tracking-${input.groupDealId}`,
        job_type: "tracking_parse",
        status: "completed",
        confidence: invoiceRows[0]?.confidence ?? null,
        needs_review: stub.requires_confirmation,
      }
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
    await matchParticipantsToInvoiceRows(scope, input.groupDealId, invoiceRows)

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
