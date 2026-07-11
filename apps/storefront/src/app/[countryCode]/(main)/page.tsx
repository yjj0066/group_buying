import { Metadata } from "next"

import { getRegion } from "@lib/data/regions"
import { resolveCountryCode } from "@lib/util/country-code"
import Hero from "@modules/home/components/hero"
import PublishedProductsGrid from "@modules/products/templates/published-products-grid"
import { getServerDictionary } from "@i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.nav.storeName,
    description: dictionary.hero.subtitle,
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)
  const region = await getRegion(countryCode)
  const dictionary = await getServerDictionary()

  return (
    <>
      <Hero />
      <PublishedProductsGrid
        countryCode={countryCode}
        regionId={region?.id}
        title={dictionary.products.allProducts}
        description={dictionary.products.homeDescription}
        emptyMessage={dictionary.products.empty}
        regionErrorMessage={dictionary.products.regionError}
      />
    </>
  )
}
