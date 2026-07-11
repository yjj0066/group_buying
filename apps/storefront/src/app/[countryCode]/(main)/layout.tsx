import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale"
import { listRegions } from "@lib/data/regions"
import { getBaseURL } from "@lib/util/env"
import { I18nProvider } from "@i18n/provider"
import { getServerDictionary } from "@i18n/server"
import { StoreCartShippingOption, StoreRegion } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: {
  children: React.ReactNode
}) {
  const dictionary = await getServerDictionary()

  const [regions, currentLocale, customer, cart] = await Promise.all([
    listRegions()
      .then((regions: StoreRegion[]) => regions)
      .catch(() => [] as StoreRegion[]),
    getLocale().catch(() => null),
    retrieveCustomer().catch(() => null),
    retrieveCart().catch(() => null),
  ])

  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    try {
      const { shipping_options } = await listCartOptions()
      shippingOptions = shipping_options
    } catch {
      shippingOptions = []
    }
  }

  return (
    <I18nProvider dictionary={dictionary}>
      <Nav
        regions={regions}
        currentLocale={currentLocale}
        dictionary={dictionary}
      />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      <Footer />
    </I18nProvider>
  )
}
