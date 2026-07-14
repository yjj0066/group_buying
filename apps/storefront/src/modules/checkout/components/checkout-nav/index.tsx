"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { useDictionary } from "@i18n/provider"

const CheckoutNav = () => {
  const t = useDictionary()

  return (
    <div className="h-16 bg-white border-b ">
      <nav className="flex h-full items-center content-container justify-between">
        <LocalizedClientLink
          href="/cart"
          className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
          data-testid="back-to-cart-link"
        >
          <ChevronDown className="rotate-90" size={16} />
          <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
            {t.checkout.backToCart}
          </span>
          <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
            {t.checkout.back}
          </span>
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/"
          className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
          data-testid="store-link"
        >
          {t.nav.storeName}
        </LocalizedClientLink>
        <div className="flex-1 basis-0" />
      </nav>
    </div>
  )
}

export default CheckoutNav
