export type GroupDealOptionType = "member" | "goods"

export type GroupDealOption = {
  id: string
  group_deal_id: string
  option_type: GroupDealOptionType
  option_key: string
  label: string
  deal_price: number
  original_price: number
  max_quantity: number | null
  target_quantity: number | null
  current_quantity: number | null
  remaining_quantity?: number | null
  quantity?: number | null
  sort_order: number
  is_active: boolean
  metadata: Record<string, unknown> | null
}

export type GroupDealTimelineStage =
  | "created"
  | "recruiting"
  | "payment"
  | "purchasing"
  | "opening"
  | "shipping"
  | "settlement"

export const DEAL_TIMELINE_STAGES: GroupDealTimelineStage[] = [
  "created",
  "recruiting",
  "payment",
  "purchasing",
  "opening",
  "shipping",
  "settlement",
]

export type GroupDealStatus =
  | "draft"
  | "open"
  | "recruiting"
  | "deposit_pending"
  | "minimum_reached"
  | "active"
  | "purchase"
  | "purchasing"
  | "opening"
  | "shipping"
  | "settlement"
  | "completed"
  | "closed"
  | "cancelled"

export type GroupDeal = {
  id: string
  title: string
  description?: string | null
  product_id?: string | null
  variant_id?: string | null
  min_participants: number
  current_participants: number
  target_quantity: number
  current_quantity: number
  max_quantity?: number | null
  original_price: number
  deal_price: number
  currency_code: string
  status: GroupDealStatus
  starts_at: string
  ends_at: string
  metadata?: Record<string, unknown> | null
  leader_customer_id?: string | null
  leader_role_number?: number
  is_first_time_leader?: boolean
  leader_completed_deals?: number
  leader_trust_score?: number
  deposit_status?: "pending" | "deposited" | "secured" | null
  deposit_amount?: number | null
  purchase_receipt_status?: "pending" | "verified" | "failed" | "uploaded" | "rejected" | null
  purchase_receipt_url?: string | null
  purchase_receipt_structured?: Record<string, unknown> | null
  receipt_ai_status?:
    | "not_requested"
    | "processing"
    | "parsed"
    | "needs_review"
    | "failed"
    | null
  receipt_ai_confidence?: number | null
  receipt_ai_job_id?: string | null
  receipt_ai_result?: Record<string, unknown> | null
  tracking_ai_status?:
    | "not_requested"
    | "processing"
    | "parsed"
    | "needs_review"
    | "failed"
    | null
  tracking_ai_confidence?: number | null
  tracking_ai_job_id?: string | null
  tracking_ai_result?: Record<string, unknown> | null
  report_stage?:
    | "not_started"
    | "receipt_review"
    | "shipping"
    | "settlement_ready"
    | "settled"
    | null
  dispute_status?: "none" | "open" | "under_review" | "resolved" | null
  is_urgent_fill?: boolean
  options?: GroupDealOption[]
  total_seats?: number
  filled_seats?: number
  created_at: string
  updated_at: string
}

export type VirtualAccountInfo = {
  bank_name: string
  account_number: string
  account_holder: string
  amount: number
  currency_code: string
  expires_at: string
}

export type GroupDealParticipation = {
  id: string
  deal_id: string
  option_id: string
  member_label: string
  status: "pending_deposit" | "confirmed" | "expired" | "cancelled"
  virtual_account?: VirtualAccountInfo | null
}

export const getOptionRemainingQuantity = (
  option: GroupDealOption
): number | null => {
  if (option.remaining_quantity != null) {
    return option.remaining_quantity
  }

  if (option.max_quantity != null && option.current_quantity != null) {
    return Math.max(0, option.max_quantity - option.current_quantity)
  }

  if (option.quantity != null && option.remaining_quantity == null) {
    return option.quantity
  }

  return null
}

export const isDepositSecured = (deal: GroupDeal): boolean =>
  deal.deposit_status === "deposited" || deal.deposit_status === "secured"

export const isFirstTimeLeader = (deal: GroupDeal): boolean => {
  if (deal.is_first_time_leader === false) {
    return false
  }

  if (deal.leader_role_number != null && deal.leader_role_number > 1) {
    return false
  }

  return (
    deal.is_first_time_leader === true ||
    (deal.leader_completed_deals ?? 0) === 0
  )
}

export const isDealSoldOut = (deal: GroupDeal): boolean => {
  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  if (memberOptions.length) {
    return memberOptions.every((option) => {
      const remaining = getOptionRemainingQuantity(option)
      return remaining != null && remaining <= 0
    })
  }

  const target = deal.target_quantity || deal.min_participants

  return (deal.current_participants ?? deal.current_quantity) >= target
}

export const hasMemberVacancy = (deal: GroupDeal, member: string): boolean => {
  const option = (deal.options ?? []).find(
    (item) => item.option_type === "member" && item.label === member
  )

  if (!option) {
    return false
  }

  const remaining = getOptionRemainingQuantity(option)
  return remaining == null || remaining > 0
}

export const resolveDealTimelineStage = (
  deal: GroupDeal
): GroupDealTimelineStage => {
  const statusMap: Partial<Record<GroupDealStatus, GroupDealTimelineStage>> = {
    draft: "created",
    open: "recruiting",
    recruiting: "recruiting",
    deposit_pending: "payment",
    active: "recruiting",
    purchase: "purchasing",
    purchasing: "purchasing",
    opening: "opening",
    shipping: "shipping",
    settlement: "settlement",
    completed: "settlement",
    closed: "settlement",
  }

  return statusMap[deal.status] ?? "recruiting"
}

export const getDealTimelineStageIndex = (
  stage: GroupDealTimelineStage
): number => DEAL_TIMELINE_STAGES.indexOf(stage)

export const getDealFillProgress = (deal: GroupDeal) => {
  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  if (memberOptions.length) {
    const total = memberOptions.reduce(
      (sum, option) => sum + (option.max_quantity ?? 1),
      0
    )
    const filled = memberOptions.reduce((sum, option) => {
      const remaining = getOptionRemainingQuantity(option)
      const max = option.max_quantity ?? 1

      if (remaining == null) {
        return sum + (option.current_quantity ?? 0)
      }

      return sum + Math.max(0, max - remaining)
    }, 0)

    return {
      filled,
      total,
      percent: total ? (filled / total) * 100 : 0,
    }
  }

  const total = deal.total_seats ?? deal.target_quantity ?? deal.min_participants
  const filled =
    deal.filled_seats ?? deal.current_participants ?? deal.current_quantity

  return {
    filled,
    total,
    percent: total ? (filled / total) * 100 : 0,
  }
}

export const getDaysUntilDeadline = (deal: GroupDeal): number => {
  const endsAt = new Date(deal.ends_at)
  return Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
}

export const getHoursUntilDeadline = (deal: GroupDeal): number => {
  const endsAt = new Date(deal.ends_at)
  return Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60))
  )
}

const buildOption = (
  dealId: string,
  id: string,
  label: string,
  price: number,
  originalPrice: number,
  maxQty: number,
  currentQty: number,
  sortOrder: number
): GroupDealOption => ({
  id,
  group_deal_id: dealId,
  option_type: "member",
  option_key: id,
  label,
  deal_price: price,
  original_price: originalPrice,
  max_quantity: maxQty,
  target_quantity: null,
  current_quantity: currentQty,
  sort_order: sortOrder,
  is_active: true,
  metadata: null,
})

export const createMemberOption = buildOption

export type GroupDealParticipantStage =
  | "recruiting"
  | "payment_complete"
  | "purchasing"
  | "opening"
  | "shipping"
  | "delivery_confirmed"

export const getDealDiscountPercent = (deal: GroupDeal): number => {
  if (!deal.original_price) {
    return 0
  }

  return Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  )
}

export const isDealAtCapacity = (deal: GroupDeal): boolean => {
  const target = deal.target_quantity || deal.min_participants

  return (deal.current_participants ?? deal.current_quantity) >= target
}

export const isJoinableGroupDealStatus = (status: GroupDealStatus): boolean =>
  ["open", "recruiting", "minimum_reached", "active"].includes(status)
