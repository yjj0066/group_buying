import { Metadata } from "next"

import { listHostedGroupDeals } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import HostedDealsList from "@modules/account/components/hosted-deals-list"
import { Text } from "@modules/common/components/ui"

function getAdminBaseUrl() {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

  if (url) {
    return `${url.replace(/\/$/, "")}/app`
  }

  return "http://localhost:9000/app"
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.hostedDealsTitle,
    description: dictionary.account.meta.hostedDealsDescription,
  }
}

export default async function HostedGroupDealsPage() {
  const [dictionary, deals] = await Promise.all([
    getServerDictionary(),
    listHostedGroupDeals(),
  ])

  const t = dictionary.account.hostedDeals

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{t.description}</Text>
      </div>
      <HostedDealsList
        deals={deals}
        adminBaseUrl={getAdminBaseUrl()}
        labels={{
          empty: t.empty,
          depositSecured: t.depositSecured,
          depositPending: t.depositPending,
          adminLink: t.adminLink,
          participants: t.participants,
          viewDeal: t.viewDeal,
          leaderStage: t.leaderStage,
          leaderStages: dictionary.account.groupBuying.leaderStages,
        }}
      />
    </div>
  )
}
