import type { Dictionary } from "@i18n/types"
import type {
  GroupDealDocumentParseResponse,
  StructuredInvoiceRow,
  StructuredReceiptFields,
  AiExtractField,
  VerificationItem,
} from "types/group-deal-document-ai"

const formatAmount = (amount: number | null | undefined): string | null => {
  if (amount == null || !Number.isFinite(amount)) {
    return null
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDateTime = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export const buildReceiptExtractFields = (
  t: Dictionary,
  structured: StructuredReceiptFields | null | undefined
): AiExtractField[] => {
  if (!structured) {
    return []
  }

  const fields: AiExtractField[] = []

  if (structured.seller) {
    fields.push({
      label: t.groupBuying.receiptFieldSeller,
      value: structured.seller,
      masked: structured.seller,
    })
  }

  if (structured.order_number) {
    fields.push({
      label: t.groupBuying.receiptFieldOrderNumber,
      value: structured.order_number,
      masked: structured.order_number,
    })
  }

  if (structured.ordered_at) {
    const formatted = formatDateTime(structured.ordered_at) ?? structured.ordered_at

    fields.push({
      label: t.groupBuying.receiptFieldOrderedAt,
      value: formatted,
      masked: formatted,
    })
  }

  if (structured.album_quantity != null) {
    const value = `${structured.album_quantity}${t.groupBuying.documentAiQuantitySuffix}`

    fields.push({
      label: t.groupBuying.receiptFieldAlbumQuantity,
      value,
      masked: value,
    })
  }

  const totalAmount = formatAmount(structured.total_amount)

  if (totalAmount) {
    fields.push({
      label: t.groupBuying.receiptFieldTotalAmount,
      value: totalAmount,
      masked: totalAmount,
    })
  }

  return fields
}

const RECEIPT_VALIDATION_ITEMS: Array<{
  id: string
  labelKey: keyof Dictionary["groupBuying"]
  reason: string
  detailKey: keyof Dictionary["groupBuying"]
}> = [
  {
    id: "order_number",
    labelKey: "documentAiCheckOrderNumber",
    reason: "ORDER_NUMBER_MISSING",
    detailKey: "documentAiCheckOrderNumberDetail",
  },
  {
    id: "seller",
    labelKey: "documentAiCheckSeller",
    reason: "SELLER_MISMATCH",
    detailKey: "documentAiCheckSellerDetail",
  },
  {
    id: "date",
    labelKey: "documentAiCheckDate",
    reason: "ORDER_BEFORE_ALL_PAID",
    detailKey: "documentAiCheckDateDetail",
  },
  {
    id: "quantity",
    labelKey: "documentAiCheckQuantity",
    reason: "ALBUM_QUANTITY_INSUFFICIENT",
    detailKey: "documentAiCheckQuantityDetail",
  },
]

const resolveReceiptItemStatus = (
  itemId: string,
  failed: boolean,
  structured: StructuredReceiptFields | null | undefined
): VerificationItem["status"] => {
  if (failed) {
    return "fail"
  }

  if (itemId === "date") {
    if (!structured?.ordered_at?.trim()) {
      return "skipped"
    }

    return "pass"
  }

  return "pass"
}

export const buildReceiptVerificationItems = (
  t: Dictionary,
  validation: { passed: boolean; reasons: string[] } | undefined,
  structured: StructuredReceiptFields | null | undefined,
  hasResult: boolean
): VerificationItem[] => {
  if (!hasResult) {
    return []
  }

  const reasons = new Set(validation?.reasons ?? [])

  return RECEIPT_VALIDATION_ITEMS.map((item) => {
    const failed = reasons.has(item.reason)
    const status = resolveReceiptItemStatus(item.id, failed, structured)
    const baseDetail = t.groupBuying[item.detailKey] as string
    const detail =
      item.id === "date" && status === "skipped"
        ? t.groupBuying.documentAiCheckDateSkippedDetail
        : baseDetail

    return {
      id: item.id,
      label: t.groupBuying[item.labelKey] as string,
      detail,
      status,
    }
  })
}

export const buildShippingExtractFields = (
  t: Dictionary,
  rows: StructuredInvoiceRow[] | null | undefined
): AiExtractField[] => {
  const firstRow = rows?.[0]

  if (!firstRow) {
    return []
  }

  const fields: AiExtractField[] = []

  if (firstRow.carrier) {
    fields.push({
      label: t.groupBuying.documentAiFieldCarrier,
      value: firstRow.carrier,
      masked: firstRow.carrier,
    })
  }

  if (firstRow.tracking_number) {
    fields.push({
      label: t.groupBuying.documentAiFieldTrackingNumber,
      value: firstRow.tracking_number,
      masked: maskTrackingNumber(firstRow.tracking_number),
    })
  }

  if (firstRow.recipient_name) {
    fields.push({
      label: t.groupBuying.documentAiFieldRecipient,
      value: firstRow.recipient_name,
      masked: firstRow.recipient_name,
    })
  }

  if (firstRow.address_hint) {
    fields.push({
      label: t.groupBuying.documentAiFieldAddress,
      value: firstRow.address_hint,
      masked: firstRow.address_hint,
    })
  }

  return fields
}

export const buildShippingVerificationItems = (
  t: Dictionary,
  response: GroupDealDocumentParseResponse["document_ai"]
): VerificationItem[] => {
  const matchedCount = response.auto_matched_participant_ids?.length ?? 0
  const conflictCount = response.review_conflicts?.length ?? 0

  return [
    {
      id: "extract",
      label: t.groupBuying.documentAiCheckExtract,
      detail: t.groupBuying.documentAiCheckExtractDetail,
      status:
        response.status === "failed"
          ? "fail"
          : response.invoice_rows?.length
            ? "pass"
            : "not_extracted",
    },
    {
      id: "match",
      label: t.groupBuying.documentAiCheckMatch,
      detail: t.groupBuying.documentAiCheckMatchDetail.replace(
        "{count}",
        String(matchedCount)
      ),
      status:
        matchedCount > 0
          ? "pass"
          : conflictCount > 0
            ? "fail"
            : "no_match",
    },
    {
      id: "review",
      label: t.groupBuying.documentAiCheckReview,
      detail: t.groupBuying.documentAiCheckReviewDetail.replace(
        "{count}",
        String(conflictCount)
      ),
      status: response.needs_review || conflictCount > 0 ? "fail" : "pass",
    },
  ]
}

export const resolveVerificationStatusLabel = (
  t: Dictionary,
  status: VerificationItem["status"]
): string => {
  switch (status) {
    case "pass":
      return t.groupBuying.documentAiVerificationStatusPass
    case "fail":
      return t.groupBuying.documentAiVerificationStatusFail
    case "skipped":
      return t.groupBuying.documentAiVerificationStatusSkipped
    case "no_match":
      return t.groupBuying.documentAiVerificationStatusNoMatch
    case "not_extracted":
      return t.groupBuying.documentAiVerificationStatusNotExtracted
    default:
      return t.groupBuying.documentAiVerificationStatusSkipped
  }
}

export const resolveVerificationStatusVariant = (
  status: VerificationItem["status"]
): "success" | "warning" | "default" => {
  if (status === "pass") {
    return "success"
  }

  if (status === "fail") {
    return "warning"
  }

  return "default"
}

const maskTrackingNumber = (value: string): string => {
  if (value.length <= 8) {
    return value
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

export const resolveDocumentAiStatusLabel = (
  t: Dictionary,
  status: GroupDealDocumentParseResponse["document_ai"]["status"],
  needsReview: boolean
): string => {
  if (needsReview || status === "needs_review") {
    return t.groupBuying.documentAiStatusNeedsReview
  }

  switch (status) {
    case "parsed":
      return t.groupBuying.documentAiStatusParsed
    case "failed":
      return t.groupBuying.documentAiStatusFailed
    case "processing":
      return t.groupBuying.documentAiStatusProcessing
    default:
      return t.groupBuying.documentAiStatusPending
  }
}

export type ReceiptStructuredDraft = {
  seller: string
  order_number: string
  ordered_at: string
  album_quantity: string
  total_amount: string
}

export const buildReceiptStructuredDraft = (
  structured?: StructuredReceiptFields | null
): ReceiptStructuredDraft => ({
  seller: structured?.seller ?? "",
  order_number: structured?.order_number ?? "",
  ordered_at: structured?.ordered_at ?? "",
  album_quantity:
    structured?.album_quantity != null
      ? String(structured.album_quantity)
      : "",
  total_amount:
    structured?.total_amount != null ? String(structured.total_amount) : "",
})
