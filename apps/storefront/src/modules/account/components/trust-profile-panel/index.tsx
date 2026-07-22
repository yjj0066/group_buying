"use client"

import { useState } from "react"

import { reportLeaderReview } from "@lib/data/account-group-deals-actions"
import { Button, Text } from "@modules/common/components/ui"
import type { LeaderReview, LeaderTrustProfile } from "types/account-group-deals"

type TrustProfilePanelLabels = {
  title: string
  description: string
  scoreLabel: string
  badgeLabels: Record<LeaderTrustProfile["badge"], string>
  breakdown: {
    completedDeals: string
    averageRating: string
    reviewCount: string
    onTimeRate: string
    disputeCount: string
    depositForfeitureCount: string
  }
  reviewsTitle: string
  reviewsEmpty: string
  ratingDistribution: string
  reportReview: string
  reporting: string
  reportSuccess: string
  reportError: string
  reportedBadge: string
}

type TrustProfilePanelProps = {
  profile: LeaderTrustProfile
  labels: TrustProfilePanelLabels
}

const TrustProfilePanel = ({ profile, labels }: TrustProfilePanelProps) => {
  const [reviews, setReviews] = useState(profile.reviews)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleReport = async (review: LeaderReview) => {
    if (review.reported) {
      return
    }

    setReportingId(review.id)
    setMessage(null)

    try {
      await reportLeaderReview(review.id, "inappropriate_review")
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, reported: true } : item
        )
      )
      setMessage(labels.reportSuccess)
    } catch {
      setMessage(labels.reportError)
    } finally {
      setReportingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-y-8">
      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="text-lg font-semibold">{labels.title}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {labels.description}
        </Text>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <Text className="text-xs uppercase tracking-wide text-ui-fg-muted">
              {labels.scoreLabel}
            </Text>
            <p className="text-4xl font-black text-ui-fg-base">
              {profile.trust_score.toFixed(1)}
            </p>
          </div>
          <span className="rounded-full bg-ui-bg-subtle px-3 py-1 text-sm font-semibold">
            {labels.badgeLabels[profile.badge]}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 text-sm small:grid-cols-2">
          <div>
            <dt className="text-ui-fg-muted">{labels.breakdown.completedDeals}</dt>
            <dd className="font-medium">{profile.breakdown.completed_deals}</dd>
          </div>
          <div>
            <dt className="text-ui-fg-muted">{labels.breakdown.averageRating}</dt>
            <dd className="font-medium">{profile.breakdown.average_rating}</dd>
          </div>
          <div>
            <dt className="text-ui-fg-muted">{labels.breakdown.reviewCount}</dt>
            <dd className="font-medium">{profile.breakdown.review_count}</dd>
          </div>
          <div>
            <dt className="text-ui-fg-muted">{labels.breakdown.onTimeRate}</dt>
            <dd className="font-medium">{profile.breakdown.on_time_rate}%</dd>
          </div>
          <div>
            <dt className="text-ui-fg-muted">{labels.breakdown.disputeCount}</dt>
            <dd className="font-medium">{profile.breakdown.dispute_count}</dd>
          </div>
          <div>
            <dt className="text-ui-fg-muted">
              {labels.breakdown.depositForfeitureCount}
            </dt>
            <dd className="font-medium">
              {profile.breakdown.deposit_forfeiture_count}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-semibold">{labels.ratingDistribution}</Text>
        <div className="mt-4 flex flex-col gap-2">
          {(["5", "4", "3", "2", "1"] as const).map((rating) => {
            const count = profile.rating_distribution[rating]
            const total = profile.breakdown.review_count || 1
            const width = Math.round((count / total) * 100)

            return (
              <div key={rating} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-ui-fg-muted">{rating}★</span>
                <div className="h-2 flex-1 rounded-full bg-ui-bg-subtle">
                  <div
                    className="h-2 rounded-full bg-ui-fg-interactive"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-8 text-right text-ui-fg-muted">{count}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-semibold">{labels.reviewsTitle}</Text>

        {!reviews.length ? (
          <Text className="mt-3 text-sm text-ui-fg-subtle">
            {labels.reviewsEmpty}
          </Text>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-ui-border-base p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Text className="font-medium">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </Text>
                    <Text className="text-xs text-ui-fg-muted">
                      {review.group_deal_title}
                    </Text>
                  </div>
                  {review.reported ? (
                    <span className="text-xs text-ui-fg-muted">
                      {labels.reportedBadge}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleReport(review)}
                      disabled={reportingId === review.id}
                    >
                      {reportingId === review.id
                        ? labels.reporting
                        : labels.reportReview}
                    </Button>
                  )}
                </div>
                {review.comment && (
                  <Text className="mt-2 text-sm text-ui-fg-subtle">
                    {review.comment}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        )}

        {message && (
          <Text className="mt-3 text-sm text-ui-fg-interactive">{message}</Text>
        )}
      </section>
    </div>
  )
}

export default TrustProfilePanel
