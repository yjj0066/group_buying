import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getServerDictionary } from "@i18n/server"
import { retrieveCustomer } from "@lib/data/customer"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.createGroupDealTitle,
    description: dictionary.account.meta.createGroupDealDescription,
  }
}

export default async function CreateGroupDealPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  redirect(gbAppRoutes.sellerCreateBasic(countryCode))
}
