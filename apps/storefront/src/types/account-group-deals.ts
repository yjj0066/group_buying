export type GroupDealParticipationStage =
  | "recruiting"
  | "payment_complete"
  | "purchasing"
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
  created_at: string
}

export type AccountParticipation = {
  participant_id: string
  quantity: number
  status: string
  stage: GroupDealParticipationStage
  tracking_number: string | null
  carrier: string | null
  payment_deadline: string | null
  delivery_confirmed_at: string | null
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

export type SettlementRecord = {
  id: string
  type: "deposit_refund" | "escrow_release" | "participant_refund"
  amount: number | null
  currency_code: string
  status: "completed" | "pending" | "failed"
  group_deal_id: string
  group_deal_title: string
  description: string
  processed_at: string | null
}

export type GroupBuyingPreferences = {
  favorite_idol_group: string | null
  favorite_member: string | null
  notify_vacancy: boolean
  notify_progress: boolean
}

export const PARTICIPATION_STAGES: GroupDealParticipationStage[] = [
  "recruiting",
  "payment_complete",
  "purchasing",
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
