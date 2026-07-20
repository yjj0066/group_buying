/**
 * [MYP0/MYPG] 마이페이지 홈
 * Wireframe ID: MYP0 (MYPG) | 도메인: 마이페이지 | 우선순위: P0
 */
import {
  retrieveGroupBuyingPreferences,
  retrieveLeaderTrustProfile,
} from "@lib/data/account-group-deals"
import { resolveGbAppOnboardingRedirect } from "@lib/data/gb-app-auth-flow"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import GbAppMyHub from "@modules/group-buying/components/gb-app-my-hub"
import { redirect } from "next/navigation"

export default async function MyPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)
  const onboardingRedirect =
    await resolveGbAppOnboardingRedirect(resolvedCountryCode)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const [customer, preferences, trustProfile] = await Promise.all([
    requireCustomerForGbApp(resolvedCountryCode),
    retrieveGroupBuyingPreferences(),
    retrieveLeaderTrustProfile(),
  ])

  return (
    <GbAppMyHub
      customer={customer}
      preferences={preferences}
      trustProfile={trustProfile}
      countryCode={resolvedCountryCode}
    />
  )
}
