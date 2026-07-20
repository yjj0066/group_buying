import { Metadata } from "next"

import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import AccountOverview from "@modules/account/components/account-overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.dashboard.title,
    description: dictionary.account.dashboard.description,
  }
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)

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
