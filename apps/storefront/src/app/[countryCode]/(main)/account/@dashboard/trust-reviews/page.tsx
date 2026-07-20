import { notFound } from "next/navigation"

import { retrieveLeaderTrustProfile } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import TrustProfilePanel from "@modules/account/components/trust-profile-panel"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata() {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.trustReviews.title,
    description: dictionary.account.trustReviews.description,
  }
}

export default async function TrustReviewsPage() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    notFound()
  }

  const [dictionary, profile] = await Promise.all([
    getServerDictionary(),
    retrieveLeaderTrustProfile(),
  ])

  if (!profile) {
    notFound()
  }

  const t = dictionary.account.trustReviews

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <p className="mt-2 text-sm text-ui-fg-subtle">{t.description}</p>
      </div>
      <TrustProfilePanel
      profile={profile}
      labels={{
        title: t.trustTitle,
        description: t.trustDescription,
        scoreLabel: t.scoreLabel,
        badgeLabels: t.badgeLabels,
        breakdown: {
          completedDeals: t.completedDeals,
          averageRating: t.averageRating,
          reviewCount: t.reviewCount,
          onTimeRate: t.onTimeRate,
          disputeCount: t.disputeCount,
          depositForfeitureCount: t.depositForfeitureCount,
        },
        reviewsTitle: t.reviewsTitle,
        reviewsEmpty: t.reviewsEmpty,
        ratingDistribution: t.ratingDistribution,
        reportReview: t.reportReview,
        reporting: t.reporting,
        reportSuccess: t.reportSuccess,
        reportError: t.reportError,
        reportedBadge: t.reportedBadge,
      }}
    />
    </div>
  )
}
