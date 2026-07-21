import { Metadata } from "next"
import { redirect } from "next/navigation"

import { listHostedGroupDeals } from "@lib/data/account-group-deals"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerDictionary } from "@i18n/server"
import HostedDealsList from "@modules/account/components/hosted-deals-list"
import { Text } from "@modules/common/components/ui"
import { resolveCountryCode } from "@lib/util/country-code"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.hostedDealsTitle,
    description: dictionary.account.meta.hostedDealsDescription,
  }
}

export default async function HostedGroupDealsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)

  const [dictionary, customer, deals] = await Promise.all([
    getServerDictionary(),
    retrieveCustomer(),
    listHostedGroupDeals(),
  ])

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const t = dictionary.account.hostedDeals
  const leaderStages = dictionary.account.groupBuying.leaderStages

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{t.description}</Text>
      </div>
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
          stageClosed: t.stageClosed,
          leaderStages,
        }}
      />
    </div>
  )
}
