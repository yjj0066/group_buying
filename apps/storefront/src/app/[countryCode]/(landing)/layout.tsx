import { Metadata } from "next"

import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale"
import { getBaseURL } from "@lib/util/env"
import { I18nProvider } from "@i18n/provider"
import { getServerDictionary } from "@i18n/server"
import { StoreRegion } from "@medusajs/types"
import LandingFooter from "@modules/landing/components/landing-footer"
import LandingNav from "@modules/landing/components/landing-nav"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function LandingLayout(props: {
  children: React.ReactNode
}) {
  const dictionary = await getServerDictionary()

  const [regions, currentLocale, customer] = await Promise.all([
    listRegions()
      .then((regions: StoreRegion[]) => regions)
      .catch(() => [] as StoreRegion[]),
    getLocale().catch(() => null),
    retrieveCustomer().catch(() => null),
  ])

  void regions
  void currentLocale

  const isLoggedIn = !!customer

  return (
    <I18nProvider dictionary={dictionary}>
      <div className="min-h-screen bg-white">
        <LandingNav isLoggedIn={isLoggedIn} />
        {props.children}
        <LandingFooter isLoggedIn={isLoggedIn} />
      </div>
    </I18nProvider>
  )
}
