import { GroupDealStatus } from "../types/group-buying"

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

export const serializeStoreGroupDealOption = (
  option: DealRecord
) => ({
  id: String(option.id),
  group_deal_id: String(option.group_deal_id),
  option_type: String(option.option_type ?? "custom"),
  option_key: String(option.option_key ?? ""),
  label: String(option.label ?? ""),
  deal_price: option.deal_price != null ? toNumber(option.deal_price) : null,
  original_price:
    option.original_price != null ? toNumber(option.original_price) : null,
  max_quantity:
    option.max_quantity != null ? toNumber(option.max_quantity) : null,
  target_quantity:
    option.target_quantity != null ? toNumber(option.target_quantity) : null,
  current_quantity: toNumber(option.current_quantity),
  sort_order: toNumber(option.sort_order),
  is_active: Boolean(option.is_active ?? true),
  metadata: (option.metadata as Record<string, unknown> | null) ?? null,
})

export const serializeStoreGroupDeal = (
  deal: DealRecord,
  options: DealRecord[] = []
) => ({
  id: String(deal.id),
  title: String(deal.title ?? ""),
  description: deal.description != null ? String(deal.description) : null,
  product_id: String(deal.product_id ?? ""),
  variant_id: deal.variant_id != null ? String(deal.variant_id) : null,
  min_participants: toNumber(deal.min_participants),
  current_participants: toNumber(deal.current_participants),
  target_quantity: toNumber(deal.target_quantity),
  current_quantity: toNumber(deal.current_quantity),
  max_quantity: deal.max_quantity != null ? toNumber(deal.max_quantity) : null,
  original_price: toNumber(deal.original_price),
  deal_price: toNumber(deal.deal_price),
  currency_code: String(deal.currency_code ?? "krw"),
  status: String(deal.status ?? "draft"),
  starts_at: toIsoString(deal.starts_at),
  ends_at: toIsoString(deal.ends_at),
  metadata: (deal.metadata as Record<string, unknown> | null) ?? null,
  leader_customer_id:
    deal.leader_customer_id != null ? String(deal.leader_customer_id) : null,
  deposit_status: String(deal.deposit_status ?? "pending"),
  deposit_amount:
    deal.deposit_amount != null ? toNumber(deal.deposit_amount) : null,
  purchase_receipt_status: String(deal.purchase_receipt_status ?? "pending"),
  purchase_receipt_url:
    (deal.purchase_receipt_url as string | null) ??
    ((deal.metadata as Record<string, unknown> | null)?.purchase_receipt_url as
      | string
      | null) ??
    null,
  options: options.map(serializeStoreGroupDealOption),
  created_at: toIsoString(deal.created_at),
  updated_at: toIsoString(deal.updated_at),
})
