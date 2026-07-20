import { getLandingHomeData } from "@lib/util/landing-deals"
import { resolveCountryCode } from "@lib/util/country-code"
import { HttpTypes } from "@medusajs/types"
import type { GroupBuyingPreferences } from "types/account-group-deals"

import LandingPageClient from "./landing-page-client"

type LandingPageTemplateProps = {
  countryCode?: string
  initialCustomer?: HttpTypes.StoreCustomer | null
  initialPreferences?: GroupBuyingPreferences | null
}

const LandingPageTemplate = async ({
  countryCode = "kr",
  initialCustomer = null,
  initialPreferences = null,
}: LandingPageTemplateProps) => {
  const favoriteIdolGroup = initialPreferences?.favorite_idol_group ?? null
  const data = await getLandingHomeData({ favoriteIdolGroup })
  const resolvedCountry = resolveCountryCode(countryCode)

  return (
    <LandingPageClient
      data={data}
      countryCode={resolvedCountry}
      customerId={initialCustomer?.id ?? null}
      favoriteIdolGroup={favoriteIdolGroup}
      isLoggedIn={Boolean(initialCustomer)}
    />
  )
}

export default LandingPageTemplate
