import { Metadata } from "next"

import GroupDealsListTemplate from "@modules/group-buying/templates/group-deals-list"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.groupBuying.title,
    description: dictionary.groupBuying.listDescription,
  }
}

export default async function GroupBuyingPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)

  return <GroupDealsListTemplate countryCode={countryCode} />
}
