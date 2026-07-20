/**
 * v3 P0 DOCS-01~04 스텁: 영수증/송장 AI 구조화 파이프라인 placeholder.
 * Upstage Document Parse / Information Extract 연동 전 개발용.
 */

export type DocumentExtractKind = "purchase_receipt" | "shipping_invoice"

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

export type DocumentExtractResult = {
  kind: DocumentExtractKind
  masked_image_url: string | null
  receipt_fields?: StructuredReceiptFields
  invoice_rows?: StructuredInvoiceRow[]
  requires_confirmation: boolean
}

export const extractDocumentStub = (input: {
  kind: DocumentExtractKind
  image_url: string
  declared_album_quantity?: number | null
  primary_seller?: string | null
}): DocumentExtractResult => {
  if (input.kind === "purchase_receipt") {
    const albumQty =
      input.declared_album_quantity != null
        ? input.declared_album_quantity
        : 10

    const fields: StructuredReceiptFields = {
      seller: input.primary_seller ?? "Weverse Shop",
      order_number: `ORD-${Date.now().toString(36).toUpperCase()}`,
      ordered_at: new Date().toISOString(),
      album_quantity: albumQty,
      total_amount: null,
      confidence: 0.82,
    }

    const requiresConfirmation =
      fields.confidence < 0.85 ||
      (input.declared_album_quantity != null &&
        fields.album_quantity != null &&
        fields.album_quantity < input.declared_album_quantity)

    return {
      kind: input.kind,
      masked_image_url: input.image_url,
      receipt_fields: fields,
      requires_confirmation: requiresConfirmation,
    }
  }

  return {
    kind: input.kind,
    masked_image_url: input.image_url,
    invoice_rows: [
      {
        recipient_name: "참여자***",
        carrier: "CJ대한통운",
        tracking_number: null,
        address_hint: "서울***",
        confidence: 0.75,
        needs_review: true,
      },
    ],
    requires_confirmation: true,
  }
}

export const validatePurchaseReceiptStub = (input: {
  structured: StructuredReceiptFields
  declared_album_quantity: number | null
  primary_seller: string | null
  all_participants_paid_at: string | null
}): { passed: boolean; reasons: string[] } => {
  const reasons: string[] = []

  if (!input.structured.order_number) {
    reasons.push("ORDER_NUMBER_MISSING")
  }

  if (
    input.primary_seller &&
    input.structured.seller &&
    !input.structured.seller
      .toLowerCase()
      .includes(input.primary_seller.toLowerCase().slice(0, 4))
  ) {
    reasons.push("SELLER_MISMATCH")
  }

  if (input.all_participants_paid_at && input.structured.ordered_at) {
    const paidAt = new Date(input.all_participants_paid_at).getTime()
    const orderedAt = new Date(input.structured.ordered_at).getTime()

    if (orderedAt <= paidAt) {
      reasons.push("ORDER_BEFORE_ALL_PAID")
    }
  }

  if (
    input.declared_album_quantity != null &&
    input.structured.album_quantity != null &&
    input.structured.album_quantity < input.declared_album_quantity
  ) {
    reasons.push("ALBUM_QUANTITY_INSUFFICIENT")
  }

  return {
    passed: reasons.length === 0,
    reasons,
  }
}
