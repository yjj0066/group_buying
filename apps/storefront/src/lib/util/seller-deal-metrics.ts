import type { GroupDealLeaderStage } from "types/account-group-deals"
import { getLeaderStageIndex, LEADER_STAGES } from "types/account-group-deals"
import { gbAppRoutes } from "@lib/wireframe/routes"
import type { GroupDeal } from "types/group-deal"
import { getDealFillProgress, getDaysUntilDeadline } from "types/group-deal"
import type { AccountGroupDeal } from "types/account-group-deals"
import { loadLeaderDealRuntimeState } from "@modules/group-buying/components/leader-deal-runtime/storage"
import type { HostedDealParticipant } from "@lib/util/seller-deal-dashboard-data"
import {
  areAllParticipantDepositsPaid,
  computeRecruitmentAmount,
  countActiveParticipants,
  countDepositPaidParticipants,
} from "@lib/util/seller-deal-dashboard-data"

export type LeaderMenuStageStatus = "waiting" | "in_progress" | "completed"

export type LeaderManagementMenuKey =
  | "recruitment"
  | "purchase_proof"
  | "shipping"
  | "settlement"

export type LeaderDealStatusBadgeKey =
  | "preparing"
  | "recruiting"
  | "purchasing"
  | "inspecting"
  | "shipping"
  | "settlement"
  | "completed"

export type SellerDashboardMetrics = {
  filled: number
  total: number
  vacant: number
  daysLeft: number
  fillPercent: number
  depositPaidCount: number
  totalRecruitmentAmount: number
  depositAmount: number
  allDepositsPaid: boolean
}

export type SellerPackingCtaState = "hidden" | "enabled" | "disabled"

const hasShippingCompletedMarker = (deal: GroupDeal): boolean => {
  const shippingCompletedAt = deal.metadata?.shipping_completed_at

  return typeof shippingCompletedAt === "string" && shippingCompletedAt.length > 0
}

export const areAllPaidParticipantsDeliveryConfirmed = (
  participants: HostedDealParticipant[]
): boolean => {
  const paid = participants.filter(
    (participant) => participant.deposit_status === "paid"
  )

  if (!paid.length) {
    return false
  }

  return paid.every(
    (participant) =>
      Boolean(participant.delivery_confirmed_at) ||
      participant.stage === "delivery_confirmed"
  )
}

export const isSellerPackingPhaseComplete = (
  deal: GroupDeal,
  participants: HostedDealParticipant[] = []
): boolean => {
  const stage = resolveLeaderStageFromDeal(deal)

  if (
    stage === "shipping" ||
    stage === "closing" ||
    stage === "settled"
  ) {
    return true
  }

  if (
    deal.status === "shipping" ||
    deal.status === "settlement" ||
    deal.status === "completed" ||
    deal.status === "closed"
  ) {
    return true
  }

  if (hasShippingCompletedMarker(deal)) {
    return true
  }

  if (areAllPaidParticipantsDeliveryConfirmed(participants)) {
    return true
  }

  // Tracking already registered for every paid seat — packing start is no longer needed.
  const paid = participants.filter(
    (participant) => participant.deposit_status === "paid"
  )

  if (
    paid.length > 0 &&
    paid.every((participant) => Boolean(participant.tracking_number))
  ) {
    return true
  }

  return false
}

export const resolveSellerPackingCtaState = (
  deal: GroupDeal,
  metrics: SellerDashboardMetrics,
  participants: HostedDealParticipant[] = []
): SellerPackingCtaState => {
  if (isSellerPackingPhaseComplete(deal, participants)) {
    return "hidden"
  }

  if (metrics.allDepositsPaid) {
    return "enabled"
  }

  return "disabled"
}

export const computeSellerDashboardMetrics = (
  deal: GroupDeal,
  participants: HostedDealParticipant[] = []
): SellerDashboardMetrics => {
  const { total } = getDealFillProgress(deal)
  const filledFromParticipants = countActiveParticipants(participants)
  const filled =
    participants.length > 0
      ? filledFromParticipants
      : getDealFillProgress(deal).filled
  const vacant = Math.max(0, total - filled)
  const daysLeft = getDaysUntilDeadline(deal)
  const fillPercent = total ? Math.round((filled / total) * 100) : 0
  const totalRecruitmentAmount = computeRecruitmentAmount(deal, participants)
  const depositAmount = deal.deposit_amount ?? computeDepositAmount(totalRecruitmentAmount)
  const depositPaidCount = countDepositPaidParticipants(participants)
  const allDepositsPaid = areAllParticipantDepositsPaid(participants)

  return {
    filled,
    total,
    vacant,
    daysLeft,
    fillPercent,
    depositPaidCount,
    totalRecruitmentAmount,
    depositAmount,
    allDepositsPaid,
  }
}

export const computeDepositAmount = (recruitmentTotal: number) => {
  const raw = Math.round(recruitmentTotal * 0.1)
  return Math.max(30000, Math.min(300000, raw))
}

export const resolveLeaderStageFromDeal = (
  deal: GroupDeal
): GroupDealLeaderStage => {
  const fromMeta = deal.metadata?.leader_stage

  if (
    typeof fromMeta === "string" &&
    LEADER_STAGES.includes(fromMeta as GroupDealLeaderStage)
  ) {
    return fromMeta as GroupDealLeaderStage
  }

  const statusToStage: Partial<
    Record<GroupDeal["status"], GroupDealLeaderStage>
  > = {
    draft: "created",
    deposit_pending: "deposit_pending",
    recruiting: "recruiting",
    open: "recruiting",
    active: "recruiting",
    minimum_reached: "recruiting",
    purchase: "verify_and_order",
    purchasing: "verify_and_order",
    opening: "receive_inspect",
    shipping: "shipping",
    settlement: "closing",
    completed: "settled",
    closed: "settled",
  }

  return statusToStage[deal.status] ?? "recruiting"
}

export const resolveLeaderDealStatusBadgeKey = (
  deal: GroupDeal
): LeaderDealStatusBadgeKey => {
  const stage = resolveLeaderStageFromDeal(deal)

  const map: Record<GroupDealLeaderStage, LeaderDealStatusBadgeKey> = {
    created: "preparing",
    deposit_pending: "preparing",
    recruiting: "recruiting",
    verify_and_order: "purchasing",
    receive_inspect: "inspecting",
    shipping: "shipping",
    closing: "settlement",
    settled: "completed",
  }

  return map[stage] ?? "recruiting"
}

export const resolveLeaderManagementMenuStatus = (
  deal: GroupDeal,
  menu: LeaderManagementMenuKey
): LeaderMenuStageStatus => {
  const stage = resolveLeaderStageFromDeal(deal)
  const stageIdx = getLeaderStageIndex(stage)
  const { filled, total } = getDealFillProgress(deal)
  const isRecruitmentFull = total > 0 && filled >= total

  switch (menu) {
    case "recruitment": {
      if (stageIdx >= getLeaderStageIndex("verify_and_order")) {
        return "completed"
      }

      if (isRecruitmentFull && stageIdx >= getLeaderStageIndex("recruiting")) {
        return "completed"
      }

      if (stageIdx >= getLeaderStageIndex("recruiting")) {
        return "in_progress"
      }

      return "waiting"
    }
    case "purchase_proof": {
      if (
        deal.purchase_receipt_status === "verified" ||
        stageIdx >= getLeaderStageIndex("receive_inspect")
      ) {
        return "completed"
      }

      if (stageIdx >= getLeaderStageIndex("verify_and_order")) {
        return "in_progress"
      }

      return "waiting"
    }
    case "shipping": {
      if (stageIdx >= getLeaderStageIndex("closing")) {
        return "completed"
      }

      if (stageIdx >= getLeaderStageIndex("shipping")) {
        return "in_progress"
      }

      return "waiting"
    }
    case "settlement": {
      if (stageIdx >= getLeaderStageIndex("settled")) {
        return "completed"
      }

      if (stageIdx >= getLeaderStageIndex("closing")) {
        return "in_progress"
      }

      return "waiting"
    }
  }
}

export const resolveLeaderManagementMenuHref = (
  countryCode: string,
  dealId: string,
  menu: LeaderManagementMenuKey
): string => {
  switch (menu) {
    case "recruitment":
      return gbAppRoutes.sellerRecruitment(countryCode, dealId)
    case "purchase_proof":
      return gbAppRoutes.sellerPurchaseProof(countryCode, dealId)
    case "shipping":
      return gbAppRoutes.sellerShipping(countryCode, dealId)
    case "settlement":
      return gbAppRoutes.sellerSettlement(countryCode, dealId)
  }
}

export type HostedDealTab = "draft" | "recruiting" | "active" | "completed"

export const applyHostedDealRuntimeOverrides = (
  deal: AccountGroupDeal
): AccountGroupDeal => {
  const runtime = loadLeaderDealRuntimeState(deal.id)

  if (!runtime) {
    return deal
  }

  return {
    ...deal,
    status: runtime.status,
    leader_stage: runtime.leader_stage,
    settlement_submitted_at: runtime.settlementSubmittedAt,
  }
}

export const isHostedDealSettlementComplete = (
  deal: AccountGroupDeal
): boolean => {
  if (deal.leader_stage === "settled") {
    return true
  }

  if (deal.settlement_submitted_at || deal.settled_at) {
    return true
  }

  const metadata = deal.metadata

  if (
    metadata &&
    typeof metadata === "object" &&
    typeof metadata.settlement_submitted_at === "string" &&
    metadata.settlement_submitted_at
  ) {
    return true
  }

  return deal.report_stage === "settled"
}

export const resolveHostedDealLink = (
  countryCode: string,
  deal: AccountGroupDeal
): string => {
  if (isHostedDealSettlementComplete(deal)) {
    return gbAppRoutes.sellerDealReport(countryCode, deal.id)
  }

  return gbAppRoutes.sellerDeal(countryCode, deal.id)
}

const IN_PROGRESS_STATUSES = new Set<GroupDeal["status"]>([
  "purchase",
  "purchasing",
  "opening",
  "shipping",
  "settlement",
])

const RECRUITING_STATUSES = new Set<GroupDeal["status"]>([
  "open",
  "recruiting",
  "active",
  "minimum_reached",
])

const COMPLETED_STATUSES = new Set<GroupDeal["status"]>(["completed", "closed"])

const DRAFT_STATUSES = new Set<GroupDeal["status"]>(["draft", "deposit_pending"])

export const resolveHostedDealAchievementPercent = (
  deal: import("types/account-group-deals").AccountGroupDeal
) => {
  if (!deal.target_quantity) {
    return 0
  }

  return Math.round((deal.current_participants / deal.target_quantity) * 100)
}

export const shouldShowHostedDealParticipantProgress = (
  deal: import("types/account-group-deals").AccountGroupDeal
) => {
  const tab = resolveHostedDealTab(deal)

  return tab === "draft" || tab === "recruiting"
}

export const resolveHostedDealTab = (
  deal: import("types/account-group-deals").AccountGroupDeal
): HostedDealTab => {
  const status = deal.status as GroupDeal["status"]

  if (
    COMPLETED_STATUSES.has(status) ||
    deal.leader_stage === "settled"
  ) {
    return "completed"
  }

  if (
    IN_PROGRESS_STATUSES.has(status) ||
    deal.leader_stage === "verify_and_order" ||
    deal.leader_stage === "receive_inspect" ||
    deal.leader_stage === "shipping" ||
    deal.leader_stage === "closing"
  ) {
    return "active"
  }

  if (
    DRAFT_STATUSES.has(status) ||
    deal.leader_stage === "created" ||
    (deal.leader_stage === "deposit_pending" &&
      deal.deposit_status !== "deposited")
  ) {
    return "draft"
  }

  if (
    RECRUITING_STATUSES.has(status) ||
    deal.leader_stage === "recruiting"
  ) {
    return "recruiting"
  }

  return "recruiting"
}
