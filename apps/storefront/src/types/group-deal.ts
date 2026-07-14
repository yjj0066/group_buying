export type GroupDealStatus =
  | "draft"
  | "open"
  | "minimum_reached"
  | "closed"
  | "failed"
  | "cancelled"
  | "active"
  | "success"

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

export type GroupDealParticipant = {
  id: string
  customer_id: string | null
  email: string
  quantity: number
  status: GroupDealParticipantStatus
  cart_id: string | null
  order_id: string | null
  created_at: string
  updated_at: string
}

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
  options?: GroupDealOption[]
  participants?: GroupDealParticipant[]
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

export const isJoinableGroupDealStatus = (status: GroupDealStatus): boolean => {
  return status === "open" || status === "minimum_reached" || status === "active"
}

export const isDealSoldOut = (deal: GroupDeal): boolean => {
  return deal.max_quantity != null && deal.current_quantity >= deal.max_quantity
}

export const getParticipationRate = (deal: GroupDeal): number => {
  const min = deal.min_participants || deal.target_quantity || 1
  const current = deal.current_participants ?? 0

  return Math.min(100, Math.round((current / min) * 100))
}

export const getDealStatusLabelKey = (
  status: GroupDealStatus
): "open" | "minimumReached" | "closed" | "failed" | "cancelled" | "draft" => {
  switch (status) {
    case "open":
    case "active":
      return "open"
    case "minimum_reached":
    case "success":
      return "minimumReached"
    case "closed":
      return "closed"
    case "failed":
      return "failed"
    case "cancelled":
      return "cancelled"
    default:
      return "draft"
  }
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
