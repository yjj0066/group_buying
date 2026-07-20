type DealRecord = Record<string, unknown>

export type LeaderReviewRecord = {
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

export type LeaderTrustBreakdown = {
  completed_deals: number
  average_rating: number
  review_count: number
  on_time_rate: number
  dispute_count: number
  deposit_forfeiture_count: number
}

export type LeaderTrustProfile = {
  trust_score: number
  badge: "platinum" | "gold" | "silver" | "bronze" | "newcomer"
  breakdown: LeaderTrustBreakdown
  reviews: LeaderReviewRecord[]
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

const EMPTY_DISTRIBUTION = (): LeaderTrustProfile["rating_distribution"] => ({
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
})

const resolveBadge = (
  score: number,
  completedDeals: number
): LeaderTrustProfile["badge"] => {
  if (completedDeals <= 0) {
    return "newcomer"
  }

  if (score >= 4.5 && completedDeals >= 5) {
    return "platinum"
  }

  if (score >= 4 && completedDeals >= 3) {
    return "gold"
  }

  if (score >= 3.5) {
    return "silver"
  }

  return "bronze"
}

export const buildLeaderTrustProfile = (
  hostedDeals: DealRecord[]
): LeaderTrustProfile => {
  const reviews: LeaderReviewRecord[] = []
  const distribution = EMPTY_DISTRIBUTION()
  let disputeCount = 0
  let depositForfeitureCount = 0
  let completedDeals = 0
  let onTimeDeals = 0

  for (const deal of hostedDeals) {
    const status = String(deal.status ?? "")

    if (status === "settled") {
      completedDeals += 1

      const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

      if (metadata.delivered_on_time === true) {
        onTimeDeals += 1
      }
    }

    if (deal.deposit_status === "forfeited") {
      depositForfeitureCount += 1
    }

    const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
    const dealDisputes = Array.isArray(metadata.disputes)
      ? metadata.disputes.length
      : 0

    disputeCount += dealDisputes

    const rawReviews = Array.isArray(metadata.leader_reviews)
      ? metadata.leader_reviews
      : []

    for (const item of rawReviews) {
      if (!item || typeof item !== "object") {
        continue
      }

      const record = item as Record<string, unknown>
      const rating = Math.min(5, Math.max(1, Number(record.rating ?? 0)))

      if (!Number.isFinite(rating) || rating <= 0) {
        continue
      }

      const ratingKey = String(rating) as keyof typeof distribution

      if (ratingKey in distribution) {
        distribution[ratingKey] += 1
      }

      reviews.push({
        id: String(
          record.id ??
            `${deal.id}-${record.participant_id ?? reviews.length}`
        ),
        group_deal_id: String(deal.id),
        group_deal_title: String(deal.title ?? ""),
        participant_id: String(record.participant_id ?? ""),
        customer_id: String(record.customer_id ?? ""),
        rating,
        comment:
          record.comment != null ? String(record.comment) : null,
        created_at: record.created_at
          ? new Date(record.created_at as string | Date).toISOString()
          : new Date(0).toISOString(),
        reported: record.reported === true,
      })
    }
  }

  reviews.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const reviewCount = reviews.length
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0

  const onTimeRate =
    completedDeals > 0 ? onTimeDeals / completedDeals : 1

  let trustScore = 3

  if (reviewCount > 0) {
    trustScore = averageRating
  }

  if (completedDeals >= 3) {
    trustScore += 0.3
  }

  if (onTimeRate >= 0.9) {
    trustScore += 0.2
  }

  if (disputeCount > 0) {
    trustScore -= Math.min(1, disputeCount * 0.2)
  }

  if (depositForfeitureCount > 0) {
    trustScore -= depositForfeitureCount * 0.5
  }

  trustScore = Math.max(1, Math.min(5, Math.round(trustScore * 10) / 10))

  return {
    trust_score: trustScore,
    badge: resolveBadge(trustScore, completedDeals),
    breakdown: {
      completed_deals: completedDeals,
      average_rating: Math.round(averageRating * 10) / 10,
      review_count: reviewCount,
      on_time_rate: Math.round(onTimeRate * 100),
      dispute_count: disputeCount,
      deposit_forfeiture_count: depositForfeitureCount,
    },
    reviews,
    rating_distribution: distribution,
  }
}
