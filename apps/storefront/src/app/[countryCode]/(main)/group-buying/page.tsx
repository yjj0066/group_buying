import { Metadata } from "next"
import { Suspense } from "react"

import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { retrieveCustomer } from "@lib/data/customer"
import { listGroupDeals } from "@lib/data/group-deals"
import { buildInitialFiltersFromPreferences } from "@lib/util/group-deal-filters"
import { parseFiltersFromSearchParams } from "@lib/util/group-deal-filter-url"
import { getServerDictionary } from "@i18n/server"
import GroupDealsCatalog from "@modules/group-buying/components/group-deals-catalog"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.groupBuying.title,
    description: dictionary.groupBuying.listDescription,
  }
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GroupBuyingListPage(props: Props) {
  const params = await props.params
  const [{ group_deals: deals }, customer, urlSearchParams] = await Promise.all([
    listGroupDeals({ countryCode: params.countryCode }),
    retrieveCustomer().catch(() => null),
    props.searchParams,
  ])

  const preferences = customer
    ? await retrieveGroupBuyingPreferences().catch(() => null)
    : null

  const preferenceFilters = buildInitialFiltersFromPreferences(preferences)
  const initialFilters = parseFiltersFromSearchParams(
    urlSearchParams,
    preferenceFilters
  )

  return (
    <Suspense
      fallback={
        <div className="content-container py-10 text-sm text-[var(--bb-mute)]">
          불러오는 중...
        </div>
      }
    >
      <GroupDealsCatalog deals={deals} initialFilters={initialFilters} />
    </Suspense>
  )
}
