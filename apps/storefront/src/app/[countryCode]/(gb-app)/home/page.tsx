/**
 * [HOME] 홈
 * Wireframe ID: HOME | 도메인: 홈 | 우선순위: P0
 */
import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { resolveGbAppOnboardingRedirect } from "@lib/data/gb-app-auth-flow"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import {
  loadHomeDashboardData,
} from "@lib/data/group-deals"
import { resolveCountryCode } from "@lib/util/country-code"
import HomeModeDashboard from "@modules/group-buying/components/home-mode-dashboard"
import { redirect } from "next/navigation"

type HomePageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { countryCode } = await params
  const resolvedCountryCode = resolveCountryCode(countryCode)
  const onboardingRedirect =
    await resolveGbAppOnboardingRedirect(resolvedCountryCode)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const [, { deals, hostedDeals }, preferences] = await Promise.all([
    requireCustomerForGbApp(resolvedCountryCode),
    loadHomeDashboardData(),
    retrieveGroupBuyingPreferences(),
  ])

  return (
    <HomeModeDashboard
      deals={deals}
      hostedDeals={hostedDeals}
      initialPreferences={preferences}
    />
  )
}
