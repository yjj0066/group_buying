import type { GroupDeal } from "types/group-deal"
import { isDepositSecured, isFirstTimeLeader } from "types/group-deal"

export { isFirstTimeLeader }

export type LeaderTrustResult = {
  score: number
  maxScore: number
  tier: "excellent" | "good" | "fair" | "caution" | "newcomer"
  isFirstTime: boolean
}

export const getLeaderRoleNumber = (deal: GroupDeal): number => {
  if (deal.leader_role_number != null && deal.leader_role_number > 0) {
    return deal.leader_role_number
  }

  const completedDeals = deal.leader_completed_deals ?? 0
  return Math.max(1, completedDeals + 1)
}

export const calculateLeaderTrustScore = (deal: GroupDeal): LeaderTrustResult => {
  if (isFirstTimeLeader(deal)) {
    return { score: 0, maxScore: 100, tier: "newcomer", isFirstTime: true }
  }

  const score = deal.leader_trust_score ?? 75

  if (score >= 85) {
    return { score, maxScore: 100, tier: "excellent", isFirstTime: false }
  }

  if (score >= 70) {
    return { score, maxScore: 100, tier: "good", isFirstTime: false }
  }

  if (score >= 55) {
    return { score, maxScore: 100, tier: "fair", isFirstTime: false }
  }

  return { score, maxScore: 100, tier: "caution", isFirstTime: false }
}

export const getLeaderTrustDescriptionKey = (
  tier: LeaderTrustResult["tier"]
): "excellent" | "good" | "fair" | "caution" => {
  if (tier === "newcomer") {
    return "fair"
  }

  return tier
}

export const getLeaderTrustBadges = (deal: GroupDeal) => {
  const badges: Array<{
    label: string
    variant?: "deposit" | "trust" | "success"
  }> = []

  if (isDepositSecured(deal)) {
    badges.push({ label: "deposit", variant: "deposit" })
  }

  return badges
}
