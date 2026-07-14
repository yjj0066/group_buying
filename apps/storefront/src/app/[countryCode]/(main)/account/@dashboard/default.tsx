import { getServerDictionary } from "@i18n/server"
import AccountOverview from "@modules/account/components/account-overview"

export default async function AccountOverviewPage() {
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
