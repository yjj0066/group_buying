"use client"

import {
  computeTrustContributions,
  estimateAverageShippingDays,
  getTrustBadgeVariant,
  trustScoreToPoints,
  type TrustContribution,
} from "@lib/util/trust-profile-display"
import { BbAlert, BbBadge, BbCard, BbSectionHeader } from "@modules/design-system"
import StarRatingDisplay from "@modules/group-buying/components/star-rating-display"
import type { LeaderReview, LeaderTrustProfile } from "types/account-group-deals"

type MyTrustReviewsViewLabels = {
  title: string
  description: string
  scoreUnit: string
  statsSummary: string
  contributionsTitle: string
  contributionLabels: Record<TrustContribution["key"], string>
  reviewsTitle: string
  reviewsEmpty: string
  noEditNotice: string
  badgeLabels: Record<LeaderTrustProfile["badge"], string>
}

type MyTrustReviewsViewProps = {
  profile: LeaderTrustProfile
  labels: MyTrustReviewsViewLabels
}

const ContributionBar = ({
  label,
  contribution,
}: {
  label: string
  contribution: TrustContribution
}) => {
  const isNegative = contribution.direction === "negative"
  const barColor = isNegative ? "bg-rose-400" : "bg-gradient-to-r from-brand-pink to-brand-purple"
  const impactPrefix = contribution.impact > 0 ? "+" : ""

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-[var(--bb-ink)]">{label}</span>
        <span
          className={
            isNegative ? "text-sm font-semibold text-rose-600" : "text-sm font-semibold text-emerald-600"
          }
        >
          {impactPrefix}
          {contribution.impact}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bb-line)]/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${contribution.percent}%` }}
        />
      </div>
    </div>
  )
}

const ReviewItem = ({ review }: { review: LeaderReview }) => (
  <li className="rounded-xl border border-[var(--bb-line)] bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <StarRatingDisplay rating={review.rating} size="md" />
      <time
        className="text-xs text-[var(--bb-mute)]"
        dateTime={review.created_at}
      >
        {new Date(review.created_at).toLocaleDateString("ko-KR")}
      </time>
    </div>
    {review.comment && (
      <p className="mt-2 text-sm leading-relaxed text-[var(--bb-ink)]">
        {review.comment}
      </p>
    )}
    {review.group_deal_title && (
      <p className="mt-2 text-xs text-[var(--bb-mute)]">
        {review.group_deal_title}
      </p>
    )}
  </li>
)

const MyTrustReviewsView = ({ profile, labels }: MyTrustReviewsViewProps) => {
  const scorePoints = trustScoreToPoints(profile.trust_score)
  const averageShippingDays = estimateAverageShippingDays(profile.breakdown)
  const contributions = computeTrustContributions(profile)
  const statsLine = labels.statsSummary
    .replace("{count}", String(profile.breakdown.completed_deals))
    .replace("{days}", String(averageShippingDays))

  return (
    <div className="flex flex-col gap-4">
      <BbSectionHeader title={labels.title} subtitle={labels.description} />

      <BbCard tone="trust" className="shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--bb-mute)]">
              {labels.title}
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-5xl font-black bb-gradient-text">
                {scorePoints}
              </span>
              <span className="text-lg font-semibold text-[var(--bb-mute)]">
                {labels.scoreUnit}
              </span>
            </div>
          </div>
          <BbBadge
            variant={getTrustBadgeVariant(profile.badge)}
            size="md"
          >
            {labels.badgeLabels[profile.badge]}
          </BbBadge>
        </div>
        <p className="mt-3 text-sm text-[var(--bb-mute)]">{statsLine}</p>
      </BbCard>

      <section className="rounded-xl border border-[var(--bb-line)] bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--bb-ink)]">
          {labels.contributionsTitle}
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {contributions.map((contribution) => (
            <ContributionBar
              key={contribution.key}
              label={labels.contributionLabels[contribution.key]}
              contribution={contribution}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--bb-line)] bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--bb-ink)]">
          {labels.reviewsTitle}
        </h2>

        {!profile.reviews.length ? (
          <p className="mt-3 text-sm text-[var(--bb-mute)]">
            {labels.reviewsEmpty}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {profile.reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>

      <BbAlert variant="info">{labels.noEditNotice}</BbAlert>
    </div>
  )
}

export default MyTrustReviewsView
