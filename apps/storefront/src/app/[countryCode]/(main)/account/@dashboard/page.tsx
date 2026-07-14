import { Metadata } from "next"

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

  const dictionary = await getServerDictionary()

  return (
    <AccountOverview
      labels={{
        title: dictionary.account.dashboard.title,
        description: dictionary.account.dashboard.description,
        paymentMethods: dictionary.account.nav.paymentMethods,
        hostedDeals: dictionary.account.nav.hostedDeals,
        participations: dictionary.account.nav.participations,
        settlements: dictionary.account.nav.settlements,
        preferences: dictionary.account.nav.preferences,
      }}
    />
  )
}
