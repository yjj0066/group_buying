import type { LeaderTrustProfile } from "types/account-group-deals"

export type TrustContributionKey =
  | "completedDeals"
  | "reviewRating"
  | "activitySpeed"
  | "reportHistory"

export type TrustContribution = {
  key: TrustContributionKey
  /** Display width 0–100 for the bar */
  percent: number
  /** Signed point impact shown beside the bar */
  impact: number
  direction: "positive" | "negative"
}

const MAX_POSITIVE_IMPACT = 30

export const trustScoreToPoints = (trustScore: number): number =>
  Math.round(Math.min(100, Math.max(0, trustScore * 20)))

export const estimateAverageShippingDays = (
  breakdown: LeaderTrustProfile["breakdown"]
): number => {
  if (breakdown.completed_deals <= 0) {
    return 0
  }

  return Math.max(1, Math.round(5 - (breakdown.on_time_rate / 100) * 3))
}

export const computeTrustContributions = (
  profile: LeaderTrustProfile
): TrustContribution[] => {
  const { breakdown, reviews } = profile

  const completedImpact = Math.min(
    MAX_POSITIVE_IMPACT,
    breakdown.completed_deals * 5
  )
  const ratingImpact =
    breakdown.average_rating > 0
      ? Math.round((breakdown.average_rating / 5) * 25)
      : 0
  const speedImpact = Math.round((breakdown.on_time_rate / 100) * 25)
  const reportedCount = reviews.filter((review) => review.reported).length
  const reportImpact = Math.min(
    20,
    breakdown.dispute_count * 5 + reportedCount * 3
  )

  const toPercent = (impact: number) =>
    Math.min(100, Math.round((impact / MAX_POSITIVE_IMPACT) * 100))

  return [
    {
      key: "completedDeals",
      percent: toPercent(completedImpact),
      impact: completedImpact,
      direction: "positive",
    },
    {
      key: "reviewRating",
      percent: toPercent(ratingImpact),
      impact: ratingImpact,
      direction: "positive",
    },
    {
      key: "activitySpeed",
      percent: toPercent(speedImpact),
      impact: speedImpact,
      direction: "positive",
    },
    {
      key: "reportHistory",
      percent: toPercent(reportImpact),
      impact: -reportImpact,
      direction: "negative",
    },
  ]
}

export const getTrustBadgeVariant = (
  badge: LeaderTrustProfile["badge"]
): "trust" | "success" | "warning" | "default" => {
  switch (badge) {
    case "platinum":
    case "gold":
      return "trust"
    case "silver":
      return "success"
    case "bronze":
      return "warning"
    default:
      return "default"
  }
}
