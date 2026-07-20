import { Metadata } from "next"

import LandingPageTemplate from "@modules/landing/templates/landing-page"
import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerDictionary } from "@i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.landing.metaTitle,
    description: dictionary.landing.metaDescription,
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const customer = await retrieveCustomer().catch(() => null)
  const preferences = customer
    ? await retrieveGroupBuyingPreferences().catch(() => null)
    : null

  return (
    <LandingPageTemplate
      countryCode={params.countryCode}
      initialCustomer={customer}
      initialPreferences={preferences}
    />
  )
}
