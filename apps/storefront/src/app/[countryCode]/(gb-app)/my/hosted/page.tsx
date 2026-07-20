/**
 * [MID0] 내 공구 관리 (총대용)
 * Wireframe ID: MID0 | 도메인: 마이페이지 | 우선순위: P1
 */
import { listHostedGroupDeals } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import HostedDealsList from "@modules/account/components/hosted-deals-list"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import { BbSectionHeader } from "@modules/design-system"
import { resolveCountryCode } from "@lib/util/country-code"

export default async function MyHostedPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)

  const [dictionary, , deals] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(countryCode),
    listHostedGroupDeals(),
  ])

  const t = dictionary.account.hostedDeals
  const leaderStages = dictionary.account.groupBuying.leaderStages

  return (
    <div className="flex flex-col gap-6 pb-8">
      <MyPageBackLink />
      <BbSectionHeader title={t.title} subtitle={t.description} />
      <HostedDealsList
        deals={deals}
        countryCode={countryCode}
        labels={{
          empty: t.empty,
          createCta: t.createCta,
          tabDraft: t.tabDraft,
          tabRecruiting: t.tabRecruiting,
          tabActive: t.tabActive,
          tabCompleted: t.tabCompleted,
          emptyDraft: t.emptyDraft,
          emptyRecruiting: t.emptyRecruiting,
          emptyActive: t.emptyActive,
          emptyCompleted: t.emptyCompleted,
          footerNotice: t.footerNotice,
          achievementRate: t.achievementRate,
          leaderStages,
        }}
      />
    </div>
  )
}
