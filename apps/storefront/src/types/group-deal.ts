export type GroupDealStatus =
  | "draft"
  | "open"
  | "minimum_reached"
  | "closed"
  | "failed"
  | "cancelled"
  | "active"
  | "success"
  | "settled"

export type GroupDealDepositStatus = "pending" | "deposited" | "refunded"

export type GroupDealReceiptStatus =
  | "pending"
  | "uploaded"
  | "verified"
  | "rejected"

export type GroupDealOptionType = "member" | "version" | "custom"

export type GroupDealOption = {
  id: string
  group_deal_id: string
  option_type: GroupDealOptionType
  option_key: string
  label: string
  deal_price: number | null
  original_price: number | null
  max_quantity: number | null
  target_quantity: number | null
  current_quantity: number
  sort_order: number
  is_active: boolean
  metadata: Record<string, unknown> | null
}

export type GroupDealParticipantStatus =
  | "pending"
  | "reserved"
  | "confirmed"
  | "cancelled"
  | "refunded"

export type GroupDealParticipantStage =
  | "recruiting"
  | "payment_complete"
  | "purchasing"
  | "shipping"
  | "delivery_confirmed"

export type GroupDealParticipant = {
  id: string
  customer_id: string | null
  email: string
  quantity: number
  status: GroupDealParticipantStatus
  stage?: GroupDealParticipantStage
  cart_id: string | null
  order_id: string | null
  tracking_number?: string | null
  delivery_confirmed_at?: string | null
  created_at: string
  updated_at: string
}

export type GroupDealTimelineStage =
  | "created"
  | "recruiting"
  | "payment"
  | "purchasing"
  | "shipping"
  | "settlement"

export type GroupDeal = {
  id: string
  title: string
  description: string | null
  product_id: string
  variant_id: string | null
  min_participants: number
  current_participants: number
  target_quantity: number
  current_quantity: number
  max_quantity: number | null
  original_price: number
  deal_price: number
  currency_code: string
  status: GroupDealStatus
  starts_at: string
  ends_at: string
  metadata: Record<string, unknown> | null
  leader_customer_id: string | null
  deposit_status: GroupDealDepositStatus
  deposit_amount: number | null
  purchase_receipt_status: GroupDealReceiptStatus
  purchase_receipt_url?: string | null
  options?: GroupDealOption[]
  participants?: GroupDealParticipant[]
  timeline_stage?: GroupDealTimelineStage
  per_capita_shipping_fee?: number | null
  created_at: string
  updated_at: string
}

export type GroupDealsResponse = {
  group_deals: GroupDeal[]
}

export type GroupDealResponse = {
  group_deal: GroupDeal
}

export type JoinGroupDealResponse = {
  cart_id: string
  participant: GroupDealParticipant
  group_deal: GroupDeal
  checkout_path: string
  first_payment_amount?: number
  payment_hints?: {
    provider_id: string
    provider_kind: "toss" | "stripe"
    billing_mode: "reservation"
    auto_billing_context: boolean
  }
}

export type JoinWaitlistResponse = {
  waitlist_entry: {
    id: string
    email: string
    status: string
    queue_position: number
  }
  group_deal: GroupDeal
}

export type CustomerParticipation = {
  participation: GroupDealParticipant
  group_deal: GroupDeal
}

export const isJoinableGroupDealStatus = (status: GroupDealStatus): boolean => {
  return status === "open" || status === "minimum_reached" || status === "active"
}

export const isDealSoldOut = (deal: GroupDeal): boolean => {
  return deal.max_quantity != null && deal.current_quantity >= deal.max_quantity
}

export const getDealDiscountPercent = (deal: {
  original_price?: number | null
  deal_price?: number | null
}): number => {
  const originalPrice = deal.original_price ?? 0
  const dealPrice = deal.deal_price ?? 0

  if (originalPrice <= 0) {
    return 0
  }

  return Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
}

export const isDealAtCapacity = (deal: GroupDeal): boolean => {
  const target = deal.target_quantity || deal.min_participants || 1
  const current = deal.current_participants ?? deal.current_quantity ?? 0

  return current >= target
}

export const getParticipationRate = (deal: GroupDeal): number => {
  const min = deal.min_participants || deal.target_quantity || 1
  const current = deal.current_participants ?? 0

  return Math.min(100, Math.round((current / min) * 100))
}

export const getOptionRemainingQuantity = (
  option: GroupDealOption
): number | null => {
  if (option.max_quantity == null) {
    return null
  }

  return Math.max(0, option.max_quantity - option.current_quantity)
}

export const hasMemberVacancy = (
  deal: GroupDeal,
  memberKey: string
): boolean => {
  const memberOptions = (deal.options ?? []).filter(
    (option) =>
      option.option_type === "member" &&
      (option.option_key === memberKey || option.label === memberKey)
  )

  if (!memberOptions.length) {
    return false
  }

  return memberOptions.some((option) => {
    const remaining = getOptionRemainingQuantity(option)

    return remaining == null || remaining > 0
  })
}

export const isDepositSecured = (deal: GroupDeal): boolean => {
  return deal.deposit_status === "deposited"
}

export const resolveDealTimelineStage = (
  deal: GroupDeal
): GroupDealTimelineStage => {
  if (deal.timeline_stage) {
    return deal.timeline_stage
  }

  switch (deal.status) {
    case "open":
    case "minimum_reached":
    case "active":
      return "recruiting"
    case "closed":
    case "success":
      return "shipping"
    case "settled":
      return "settlement"
    default:
      return "created"
  }
}

export const resolveParticipationTab = (
  participation: CustomerParticipation
): "active" | "completed" | "cancelled" => {
  const status = participation.participation.status
  const stage = participation.participation.stage

  if (status === "cancelled" || status === "refunded") {
    return "cancelled"
  }

  if (
    stage === "delivery_confirmed" ||
    participation.participation.delivery_confirmed_at
  ) {
    return "completed"
  }

  return "active"
}

export const DEAL_TIMELINE_STAGES: GroupDealTimelineStage[] = [
  "created",
  "recruiting",
  "payment",
  "purchasing",
  "shipping",
  "settlement",
]

export const getDealTimelineStageIndex = (
  stage: GroupDealTimelineStage
): number => {
  const index = DEAL_TIMELINE_STAGES.indexOf(stage)

  return index >= 0 ? index : 0
}
