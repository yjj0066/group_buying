import {
  GroupDealDepositStatus,
  GroupDealDisputeStatus,
  GroupDealDocumentAiStatus,
  GroupDealReceiptStatus,
  GroupDealReportStage,
  GroupDealStatus,
} from "../types/group-buying"
import type { VirtualAccountInfo } from "./virtual-account"

export type StoreDealTimelineStage =
  | "created"
  | "recruiting"
  | "payment"
  | "purchasing"
  | "opening"
  | "shipping"
  | "settlement"

const STORE_VISIBLE_STATUSES: GroupDealStatus[] = [
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
  GroupDealStatus.CLOSED,
]

export const isStoreVisibleGroupDealStatus = (status: string): boolean => {
  return STORE_VISIBLE_STATUSES.includes(status as GroupDealStatus)
}

export const isDepositSecured = (deal: {
  deposit_status?: string | null
}): boolean => {
  return String(deal.deposit_status ?? "pending") === "deposited"
}

const toNumber = (value: unknown): number => {
  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : 0
}

const toIsoString = (value: unknown): string => {
  if (!value) {
    return new Date(0).toISOString()
  }

  return new Date(value as string | Date).toISOString()
}

type DealRecord = Record<string, unknown>
type ParticipantRecord = Record<string, unknown>

const readMetadata = (deal: DealRecord): Record<string, unknown> => {
  return (deal.metadata as Record<string, unknown> | null) ?? {}
}

export const isStoreVisibleGroupDeal = (deal: DealRecord): boolean => {
  const metadata = readMetadata(deal)
  const depositStatus = String(deal.deposit_status ?? GroupDealDepositStatus.PENDING)
  const depositOk =
    depositStatus === GroupDealDepositStatus.DEPOSITED ||
    depositStatus === "secured"
  const adminCreated =
    metadata.admin_created === true || metadata.source === "admin"
  const legacyAdminOpen =
    String(deal.status ?? "") === GroupDealStatus.OPEN &&
    !deal.leader_customer_id &&
    depositStatus !== GroupDealDepositStatus.REFUNDED

  return depositOk || adminCreated || legacyAdminOpen
}

export const resolveStoreDealTimelineStage = (
  deal: DealRecord
): StoreDealTimelineStage => {
  const dealStatus = String(deal.status ?? "")
  const receiptStatus = String(deal.purchase_receipt_status ?? "pending")
  const metadata = readMetadata(deal)
  const openingStatus = String(metadata.opening_status ?? "pending")

  if (dealStatus === GroupDealStatus.SETTLED) {
    return "settlement"
  }

  if (metadata.shipping_started === true || dealStatus === GroupDealStatus.CLOSED) {
    if (
      receiptStatus === GroupDealReceiptStatus.VERIFIED &&
      openingStatus === "completed"
    ) {
      return "shipping"
    }

    if (receiptStatus === GroupDealReceiptStatus.VERIFIED) {
      return "opening"
    }

    return "purchasing"
  }

  if (
    dealStatus === GroupDealStatus.MINIMUM_REACHED ||
    receiptStatus === GroupDealReceiptStatus.UPLOADED
  ) {
    return "purchasing"
  }

  if (dealStatus === GroupDealStatus.OPEN) {
    return "recruiting"
  }

  return "created"
}

export const serializeStoreGroupDealOption = (
  option: DealRecord
) => {
  const maxQuantity =
    option.max_quantity != null ? toNumber(option.max_quantity) : null
  const currentQuantity = toNumber(option.current_quantity)
  const remainingQuantity =
    maxQuantity != null ? Math.max(0, maxQuantity - currentQuantity) : null

  return {
    id: String(option.id),
    group_deal_id: String(option.group_deal_id),
    option_type: String(option.option_type ?? "custom"),
    option_key: String(option.option_key ?? ""),
    label: String(option.label ?? ""),
    deal_price: option.deal_price != null ? toNumber(option.deal_price) : null,
    original_price:
      option.original_price != null ? toNumber(option.original_price) : null,
    max_quantity: maxQuantity,
    target_quantity:
      option.target_quantity != null ? toNumber(option.target_quantity) : null,
    current_quantity: currentQuantity,
    remaining_quantity: remainingQuantity,
    sort_order: toNumber(option.sort_order),
    is_active: Boolean(option.is_active ?? true),
    metadata: (option.metadata as Record<string, unknown> | null) ?? null,
  }
}

export const serializeStoreGroupDealDocumentAiFields = (deal: DealRecord) => ({
  receipt_ai_status: String(
    deal.receipt_ai_status ?? GroupDealDocumentAiStatus.NOT_REQUESTED
  ),
  receipt_ai_confidence:
    deal.receipt_ai_confidence != null
      ? toNumber(deal.receipt_ai_confidence)
      : null,
  receipt_ai_job_id:
    deal.receipt_ai_job_id != null ? String(deal.receipt_ai_job_id) : null,
  receipt_ai_result:
    (deal.receipt_ai_result as Record<string, unknown> | null) ?? null,
  tracking_ai_status: String(
    deal.tracking_ai_status ?? GroupDealDocumentAiStatus.NOT_REQUESTED
  ),
  tracking_ai_confidence:
    deal.tracking_ai_confidence != null
      ? toNumber(deal.tracking_ai_confidence)
      : null,
  tracking_ai_job_id:
    deal.tracking_ai_job_id != null ? String(deal.tracking_ai_job_id) : null,
  tracking_ai_result:
    (deal.tracking_ai_result as Record<string, unknown> | null) ?? null,
  report_stage: String(deal.report_stage ?? GroupDealReportStage.NOT_STARTED),
  dispute_status: String(deal.dispute_status ?? GroupDealDisputeStatus.NONE),
})

export const serializeStoreGroupDeal = (
  deal: DealRecord,
  options: DealRecord[] = []
) => {
  const metadata = readMetadata(deal)
  const receiptStructured =
    (metadata.purchase_receipt_structured as Record<string, unknown> | null) ??
    null

  return {
    id: String(deal.id),
    title: String(deal.title ?? ""),
    description: deal.description != null ? String(deal.description) : null,
    product_id: String(deal.product_id ?? ""),
    variant_id: deal.variant_id != null ? String(deal.variant_id) : null,
    min_participants: toNumber(deal.min_participants),
    current_participants: toNumber(deal.current_participants),
    target_quantity: toNumber(deal.target_quantity),
    current_quantity: toNumber(deal.current_quantity),
    max_quantity:
      deal.max_quantity != null ? toNumber(deal.max_quantity) : null,
    original_price: toNumber(deal.original_price),
    deal_price: toNumber(deal.deal_price),
    currency_code: String(deal.currency_code ?? "krw"),
    status: String(deal.status ?? "draft"),
    starts_at: toIsoString(deal.starts_at),
    ends_at: toIsoString(deal.ends_at),
    metadata,
    leader_customer_id:
      deal.leader_customer_id != null ? String(deal.leader_customer_id) : null,
    deposit_status: String(deal.deposit_status ?? "pending"),
    deposit_amount:
      deal.deposit_amount != null ? toNumber(deal.deposit_amount) : null,
    declared_album_quantity:
      metadata.declared_album_quantity != null
        ? toNumber(metadata.declared_album_quantity)
        : null,
    is_urgent_fill: metadata.urgent_fill === true,
    primary_seller:
      metadata.primary_seller != null
        ? String(metadata.primary_seller)
        : null,
    expected_ship_date:
      metadata.expected_ship_date != null
        ? String(metadata.expected_ship_date)
        : null,
    purchase_receipt_status: String(deal.purchase_receipt_status ?? "pending"),
    purchase_receipt_url:
      (deal.purchase_receipt_url as string | null) ??
      (metadata.purchase_receipt_url as string | null) ??
      null,
    purchase_receipt_structured: receiptStructured,
    ...serializeStoreGroupDealDocumentAiFields(deal),
    timeline_stage: resolveStoreDealTimelineStage(deal),
    per_capita_shipping_fee:
      deal.estimated_shipping_fee != null
        ? toNumber(deal.estimated_shipping_fee)
        : metadata.per_capita_shipping_fee != null
          ? toNumber(metadata.per_capita_shipping_fee)
          : null,
    options: options.map(serializeStoreGroupDealOption),
    created_at: toIsoString(deal.created_at),
    updated_at: toIsoString(deal.updated_at),
  }
}

const SENSITIVE_PARTICIPANT_KEYS = new Set([
  "billing_key_encrypted",
  "stripe_payment_method_id_encrypted",
  "billing_customer_key",
  "capture_payment_key",
  "payment_session_id",
])

export const serializeStoreGroupDealParticipant = (
  participant: ParticipantRecord,
  dealMetadata?: Record<string, unknown> | null
) => {
  const participantId = String(participant.id)
  const virtualAccounts =
    (dealMetadata?.participant_virtual_accounts as
      | Record<string, VirtualAccountInfo>
      | undefined) ?? {}

  const serialized: Record<string, unknown> = {
    id: participantId,
    customer_id:
      participant.customer_id != null
        ? String(participant.customer_id)
        : null,
    email: String(participant.email ?? ""),
    quantity: toNumber(participant.quantity),
    status: String(participant.status ?? "pending"),
    cart_id: participant.cart_id != null ? String(participant.cart_id) : null,
    order_id: participant.order_id != null ? String(participant.order_id) : null,
    tracking_number:
      participant.tracking_number != null
        ? String(participant.tracking_number)
        : null,
    delivery_confirmed_at: participant.delivery_confirmed_at
      ? toIsoString(participant.delivery_confirmed_at)
      : null,
    payment_deadline: participant.payment_deadline
      ? toIsoString(participant.payment_deadline)
      : null,
    first_payment_amount:
      participant.first_payment_amount != null
        ? toNumber(participant.first_payment_amount)
        : null,
    virtual_account: virtualAccounts[participantId] ?? null,
    created_at: toIsoString(participant.created_at),
    updated_at: toIsoString(participant.updated_at),
  }

  for (const key of SENSITIVE_PARTICIPANT_KEYS) {
    if (key in serialized) {
      delete serialized[key]
    }
  }

  return serialized
}
