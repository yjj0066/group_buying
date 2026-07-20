import type { Dictionary } from "@i18n/types"
import type { AccountGroupDeal } from "types/account-group-deals"
import type { StructuredReceiptFields } from "types/group-deal-document-ai"

export const REPORT_STAGES = [
  "not_started",
  "receipt_review",
  "shipping",
  "settlement_ready",
  "settled",
] as const

export type ReportStage = (typeof REPORT_STAGES)[number]

export const getReportStageIndex = (stage: string): number => {
  const index = REPORT_STAGES.indexOf(stage as ReportStage)

  return index >= 0 ? index : 0
}

export const resolveDocumentAiStatusLabel = (
  t: Dictionary,
  status: string | undefined
): string => {
  switch (status) {
    case "parsed":
      return t.groupBuying.documentAiStatusParsed
    case "needs_review":
      return t.groupBuying.documentAiStatusNeedsReview
    case "failed":
      return t.groupBuying.documentAiStatusFailed
    case "processing":
      return t.groupBuying.documentAiStatusProcessing
    case "not_requested":
    default:
      return t.groupBuying.documentAiStatusPending
  }
}

export const resolveReportStageLabel = (
  labels: Record<ReportStage, string>,
  stage: string | undefined
): string => {
  if (stage && stage in labels) {
    return labels[stage as ReportStage]
  }

  return labels.not_started
}

export const resolveDisputeStatusLabel = (
  labels: Record<string, string>,
  status: string | undefined
): string => {
  if (status && labels[status]) {
    return labels[status]
  }

  return labels.none
}

export const readStructuredReceipt = (
  deal: AccountGroupDeal
): StructuredReceiptFields | null => {
  const raw = deal.purchase_receipt_structured

  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>

  return {
    seller: typeof record.seller === "string" ? record.seller : null,
    order_number:
      typeof record.order_number === "string" ? record.order_number : null,
    ordered_at:
      typeof record.ordered_at === "string" ? record.ordered_at : null,
    album_quantity:
      record.album_quantity != null ? Number(record.album_quantity) : null,
    total_amount:
      record.total_amount != null ? Number(record.total_amount) : null,
    confidence:
      record.confidence != null ? Number(record.confidence) : 0,
  }
}

export const formatConfidence = (confidence: number | null | undefined): string | null => {
  if (confidence == null || !Number.isFinite(confidence)) {
    return null
  }

  return `${Math.round(confidence * 100)}%`
}
