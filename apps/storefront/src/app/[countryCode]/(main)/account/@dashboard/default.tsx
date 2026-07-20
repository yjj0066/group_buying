import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { resolveGbAppOnboardingRedirect } from "@lib/data/gb-app-auth-flow"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerDictionary } from "@i18n/server"
import { notFound, redirect } from "next/navigation"

import AccountOverview from "@modules/account/components/account-overview"

export default async function AccountOverviewPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const onboardingRedirect = await resolveGbAppOnboardingRedirect(countryCode)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  const [dictionary, preferences] = await Promise.all([
    getServerDictionary(),
    retrieveGroupBuyingPreferences(),
  ])
  return (
    <AccountOverview
      customer={customer}
      labels={{
        title: dictionary.account.dashboard.title,
        description: dictionary.account.dashboard.description,
        hubTitle: dictionary.account.dashboard.hubTitle,
        hubSearchVacant: dictionary.landing.hub.searchVacant,
        hubCreateDeal: dictionary.landing.hub.createDeal,
        bankAccount: dictionary.account.nav.bankAccount,
        hostedDeals: dictionary.account.nav.hostedDeals,
        participations: dictionary.account.nav.participations,
        settlements: dictionary.account.nav.settlements,
        trustReviews: dictionary.account.nav.trustReviews,
        profile: dictionary.account.nav.profile,
        preferences: dictionary.account.nav.preferences,
        customerService: dictionary.account.nav.customerService,
      }}
      preferredRole={preferences.preferred_role}
    />
  )
}
