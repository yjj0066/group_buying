import type { AccountGroupDeal } from "types/account-group-deals"

export type GroupDealDocumentAiStatus =
  | "not_requested"
  | "processing"
  | "parsed"
  | "needs_review"
  | "failed"

export type StructuredReceiptFields = {
  seller: string | null
  order_number: string | null
  ordered_at: string | null
  album_quantity: number | null
  total_amount: number | null
  confidence: number
}

export type StructuredInvoiceRow = {
  recipient_name: string | null
  carrier: string | null
  tracking_number: string | null
  address_hint: string | null
  confidence: number
  needs_review: boolean
}

export type GroupDealDocumentParseResponse = {
  group_deal: AccountGroupDeal
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

export type AiExtractField = {
  label: string
  value: string
  masked?: string
}

export type VerificationItemStatus =
  | "pass"
  | "fail"
  | "skipped"
  | "no_match"
  | "not_extracted"

export type VerificationItem = {
  id: string
  label: string
  status: VerificationItemStatus
  detail?: string
}
