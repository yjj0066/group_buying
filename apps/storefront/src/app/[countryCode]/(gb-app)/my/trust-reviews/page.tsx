/**
 * [MTR0] 신뢰도·후기 관리
 * Wireframe ID: MTR0 | 도메인: 마이페이지 | 우선순위: P2
 */
import { retrieveLeaderTrustProfile } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MyTrustReviewsView from "@modules/group-buying/components/my-trust-reviews-view"

export default async function MyTrustReviewsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , profile] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(resolvedCountryCode),
    retrieveLeaderTrustProfile(),
  ])

  const t = dictionary.account.trustReviews

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      {profile ? (
        <MyTrustReviewsView
          profile={profile}
          labels={{
            title: t.title,
            description: t.description,
            scoreUnit: t.scoreUnit,
            statsSummary: t.statsSummary,
            contributionsTitle: t.contributionsTitle,
            contributionLabels: {
              completedDeals: t.contributionCompletedDeals,
              reviewRating: t.contributionReviewRating,
              activitySpeed: t.contributionActivitySpeed,
              reportHistory: t.contributionReportHistory,
            },
            reviewsTitle: t.reviewsTitle,
            reviewsEmpty: t.reviewsEmpty,
            noEditNotice: t.noEditNotice,
            badgeLabels: t.badgeLabels,
          }}
        />
      ) : (
        <p className="text-sm text-[var(--bb-mute)]">{t.reviewsEmpty}</p>
      )}
    </div>
  )
}
