export type GroupDealParticipationStage =
  | "recruiting"
  | "payment_complete"
  | "purchasing"
  | "opening"
  | "shipping"
  | "delivery_confirmed"

export type GroupDealLeaderStage =
  | "created"
  | "deposit_pending"
  | "recruiting"
  | "verify_and_order"
  | "receive_inspect"
  | "shipping"
  | "closing"
  | "settled"

export type AccountGroupDeal = {
  id: string
  title: string
  status: string
  leader_stage: GroupDealLeaderStage
  deposit_status: string
  deposit_amount: number | null
  currency_code: string
  current_participants: number
  target_quantity: number
  ends_at: string | null
  purchase_receipt_status: string
  receipt_ai_status?: string
  receipt_ai_confidence?: number | null
  tracking_ai_status?: string
  tracking_ai_confidence?: number | null
  report_stage?: string
  dispute_status?: string
  purchase_receipt_structured?: Record<string, unknown> | null
  receipt_ai_validation?: {
    passed: boolean
    reasons: string[]
  } | null
  tracking_ai_matched_count?: number
  tracking_ai_conflict_count?: number
  tracking_ai_invoice_rows?: unknown[]
  metadata?: Record<string, unknown> | null
  created_at: string
}

export type ParticipationShippingAddress = {
  recipient_name: string
  phone: string
  postal_code: string
  address_line_1: string
  address_line_2?: string | null
  delivery_note?: string | null
}

export type AccountParticipation = {
  participant_id: string
  quantity: number
  status: string
  stage: GroupDealParticipationStage
  member_label?: string | null
  tracking_number: string | null
  carrier: string | null
  payment_deadline: string | null
  delivery_confirmed_at: string | null
  shipping_address?: ParticipationShippingAddress | null
  group_deal: AccountGroupDeal
  created_at: string
}

export type SavedPaymentMethod = {
  id: string
  provider: "stripe" | "toss"
  label: string
  is_default: boolean
  last4?: string | null
  brand?: string | null
  created_at: string
}

export type SettlementType =
  | "escrow_release"
  | "participant_refund"
  | "unallocated_refund"
  | "deposit_refund"
  | "deposit_forfeiture"

export type SettlementRecord = {
  id: string
  type: SettlementType
  amount: number | null
  currency_code: string
  status: "completed" | "pending" | "failed"
  group_deal_id: string
  group_deal_title: string
  description: string
  forfeiture_reason?: string | null
  processed_at: string | null
}

export type PreferredRole = "participant" | "leader"

export type RefundBankAccount = {
  bank_name: string
  bank_code: string
  account_number_masked: string
  account_holder: string
  registered_at?: string | null
}

export type GroupBuyingPreferences = {
  favorite_idol_group: string | null
  favorite_member: string | null
  /** seat_alerts */
  notify_vacancy: boolean
  /** deal_progress_alerts */
  notify_progress: boolean
  /** payment_settlement_alerts */
  payment_settlement_alerts: boolean
  /** marketing_alerts */
  marketing_alerts: boolean
  preferred_role: PreferredRole
}

export type VacancyRisk = "low" | "medium" | "high"

export type OptionPriceRecommendation = {
  option_id: string
  option_key: string
  label: string
  current_price: number
  recommended_price: number
  fill_rate: number
  vacancy_risk: VacancyRisk
  reason: string
}

export type LeaderTrustBadge =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "newcomer"

export type LeaderReview = {
  id: string
  group_deal_id: string
  group_deal_title: string
  participant_id: string
  customer_id: string
  rating: number
  comment: string | null
  created_at: string
  reported: boolean
}

export type LeaderTrustProfile = {
  trust_score: number
  badge: LeaderTrustBadge
  breakdown: {
    completed_deals: number
    average_rating: number
    review_count: number
    on_time_rate: number
    dispute_count: number
    deposit_forfeiture_count: number
  }
  reviews: LeaderReview[]
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

export const PARTICIPATION_STAGES: GroupDealParticipationStage[] = [
  "recruiting",
  "payment_complete",
  "purchasing",
  "opening",
  "shipping",
  "delivery_confirmed",
]

export const getStageIndex = (stage: GroupDealParticipationStage): number => {
  return PARTICIPATION_STAGES.indexOf(stage)
}

export const isDepositSecuredStatus = (status: string): boolean => {
  return status === "deposited"
}

export const LEADER_STAGES: GroupDealLeaderStage[] = [
  "created",
  "deposit_pending",
  "recruiting",
  "verify_and_order",
  "receive_inspect",
  "shipping",
  "closing",
  "settled",
]

export const getLeaderStageIndex = (stage: GroupDealLeaderStage): number => {
  return LEADER_STAGES.indexOf(stage)
}

const COMPLETED_PARTICIPATION_STATUSES = new Set([
  "purchase_confirmed",
  "completed",
])

export const resolveParticipationTab = (
  participation: AccountParticipation
): "active" | "completed" | "cancelled" => {
  if (
    participation.status === "cancelled" ||
    participation.status === "refunded"
  ) {
    return "cancelled"
  }

  if (
    participation.stage === "delivery_confirmed" ||
    participation.delivery_confirmed_at ||
    COMPLETED_PARTICIPATION_STATUSES.has(participation.status)
  ) {
    return "completed"
  }

  return "active"
}
