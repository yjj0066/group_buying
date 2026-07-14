import { GroupDealStatus } from "../types/group-buying"

const STORE_VISIBLE_STATUSES: GroupDealStatus[] = [
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
  GroupDealStatus.CLOSED,
]

export const isStoreVisibleGroupDealStatus = (status: string): boolean => {
  return STORE_VISIBLE_STATUSES.includes(status as GroupDealStatus)
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

export const serializeStoreGroupDealOption = (option: DealRecord) => ({
  id: String(option.id),
  group_deal_id: String(option.group_deal_id ?? ""),
  option_type: String(option.option_type ?? "member"),
  option_key: String(option.option_key ?? ""),
  label: String(option.label ?? ""),
  deal_price: option.deal_price != null ? toNumber(option.deal_price) : null,
  original_price:
    option.original_price != null ? toNumber(option.original_price) : null,
  max_quantity:
    option.max_quantity != null ? Number(option.max_quantity) : null,
  target_quantity:
    option.target_quantity != null ? Number(option.target_quantity) : null,
  current_quantity: toNumber(option.current_quantity ?? 0),
  sort_order: Number(option.sort_order ?? 0),
  is_active: option.is_active !== false,
  metadata: (option.metadata as Record<string, unknown> | null) ?? null,
  created_at: toIsoString(option.created_at),
  updated_at: toIsoString(option.updated_at),
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
  min_participants: Number(deal.min_participants ?? 0),
  current_participants: Number(deal.current_participants ?? 0),
  target_quantity: Number(deal.target_quantity ?? 0),
  current_quantity: Number(deal.current_quantity ?? 0),
  max_quantity: deal.max_quantity != null ? Number(deal.max_quantity) : null,
  original_price: toNumber(deal.original_price),
  deal_price: toNumber(deal.deal_price),
  currency_code: String(deal.currency_code ?? "krw").toLowerCase(),
  status: String(deal.status ?? GroupDealStatus.DRAFT),
  starts_at: toIsoString(deal.starts_at),
  ends_at: toIsoString(deal.ends_at),
  metadata: (deal.metadata as Record<string, unknown> | null) ?? null,
  options: options.map(serializeStoreGroupDealOption),
  created_at: toIsoString(deal.created_at),
  updated_at: toIsoString(deal.updated_at),
})

export const serializeStoreGroupDealParticipant = (
  participant: DealRecord
) => ({
  id: String(participant.id),
  customer_id:
    participant.customer_id != null ? String(participant.customer_id) : null,
  email: String(participant.email ?? ""),
  quantity: Number(participant.quantity ?? 1),
  status: String(participant.status ?? "pending"),
  cart_id: participant.cart_id != null ? String(participant.cart_id) : null,
  order_id: participant.order_id != null ? String(participant.order_id) : null,
  created_at: toIsoString(participant.created_at),
  updated_at: toIsoString(participant.updated_at),
})
