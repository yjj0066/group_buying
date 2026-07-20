/**
 * [MACC] 계좌 관리 (MAD0 wireframe)
 * Wireframe ID: MACC | 도메인: 마이페이지 | 우선순위: P1
 */
import { Metadata } from "next"

import {
  getBankAccount,
  listHostedGroupDeals,
  listMyParticipations,
} from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import { hasActiveGroupDeals } from "@lib/util/group-deal-activity"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MyAccountView from "@modules/group-buying/components/my-account-view"
import { BbSectionHeader } from "@modules/design-system"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.bankAccountTitle,
    description: dictionary.account.meta.bankAccountDescription,
  }
}

export default async function MyAccountPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , bankAccount, hostedDeals, participations] =
    await Promise.all([
      getServerDictionary(),
      requireCustomerForGbApp(resolvedCountryCode),
      getBankAccount(),
      listHostedGroupDeals(),
      listMyParticipations(),
    ])

  const t = dictionary.account.bankAccount

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <BbSectionHeader title={t.title} subtitle={t.description} />
      <MyAccountView
        initialAccount={bankAccount}
        hasActiveDeals={hasActiveGroupDeals(hostedDeals, participations)}
      />
    </div>
  )
}
