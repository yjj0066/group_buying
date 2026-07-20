/**
 * [MINP] 내 정보 관리
 * Wireframe ID: MINP | 도메인: 마이페이지 | 우선순위: P1
 */
import { Metadata } from "next"

import {
  listHostedGroupDeals,
  listMyParticipations,
  retrieveGroupBuyingPreferences,
} from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import { hasActiveGroupDeals } from "@lib/util/group-deal-activity"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MyProfileView from "@modules/group-buying/components/my-profile-view"
import { BbSectionHeader } from "@modules/design-system"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.nav.profile,
    description: dictionary.account.profileManagement.description,
  }
}

export default async function MyProfilePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, customer, preferences, hostedDeals, participations] =
    await Promise.all([
      getServerDictionary(),
      requireCustomerForGbApp(resolvedCountryCode),
      retrieveGroupBuyingPreferences(),
      listHostedGroupDeals(),
      listMyParticipations(),
    ])

  const hasActiveDeals = hasActiveGroupDeals(hostedDeals, participations)
  const pm = dictionary.account.profileManagement

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <BbSectionHeader title={dictionary.account.nav.profile} subtitle={pm.description} />
      <MyProfileView
        customer={customer}
        initialPreferences={preferences}
        hasActiveDeals={hasActiveDeals}
      />
    </div>
  )
}
