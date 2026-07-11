import { Suspense } from "react"

import type { Dictionary } from "@i18n/types"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import LanguageSwitcherSlot from "@modules/layout/components/language-switcher/slot"
import SideMenu from "@modules/layout/components/side-menu"

type NavProps = {
  regions: StoreRegion[] | null
  currentLocale?: string | null
  dictionary: Dictionary
}

export default function Nav({
  regions,
  currentLocale = null,
  dictionary,
}: NavProps) {
  const safeLocale = currentLocale ?? null

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu regions={regions} currentLocale={safeLocale} />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase"
              data-testid="nav-store-link"
            >
              {dictionary.nav.storeName}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-4 small:gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/group-buying"
                data-testid="nav-group-buying-link"
              >
                {dictionary.nav.groupBuying}
              </LocalizedClientLink>
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                {dictionary.nav.account}
              </LocalizedClientLink>
            </div>
            <LanguageSwitcherSlot currentLocale={safeLocale} />
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  {dictionary.nav.cart} (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
