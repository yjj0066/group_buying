import type { GroupDeal } from "types/group-deal"
import { getParticipationRate, isDepositSecured } from "types/group-deal"

export type LeaderTrustScore = {
  score: number
  maxScore: number
  stars: number
  labelKey: "excellent" | "good" | "fair" | "caution"
}

export const calculateLeaderTrustScore = (deal: GroupDeal): LeaderTrustScore => {
  let score = 3

  if (isDepositSecured(deal)) {
    score += 1
  }

  if (deal.purchase_receipt_status === "verified") {
    score += 0.5
  }

  if (getParticipationRate(deal) >= 50) {
    score += 0.5
  }

  if (deal.purchase_receipt_status === "rejected") {
    score -= 1
  }

  score = Math.max(1, Math.min(5, score))

  const stars = Math.round(score * 2) / 2

  let labelKey: LeaderTrustScore["labelKey"] = "fair"

  if (score >= 4.5) {
    labelKey = "excellent"
  } else if (score >= 3.5) {
    labelKey = "good"
  } else if (score < 2.5) {
    labelKey = "caution"
  }

  return {
    score,
    maxScore: 5,
    stars,
    labelKey,
  }
}
