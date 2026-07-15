import { Metadata } from "next"

import { listGroupDeals } from "@lib/data/group-deals"
import { getServerDictionary } from "@i18n/server"
import GroupDealsCatalog from "@modules/group-buying/components/group-deals-catalog"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.groupBuying.title,
    description: dictionary.groupBuying.listDescription,
  }
}

export default async function GroupBuyingListPage() {
  const { group_deals: deals } = await listGroupDeals()

  return <GroupDealsCatalog deals={deals} />
}
