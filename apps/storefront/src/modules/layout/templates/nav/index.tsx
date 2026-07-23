import { Suspense } from "react"

import type { Dictionary } from "@i18n/types"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { PokaCatchLogo } from "@modules/common/components/pokacatch-logo"
import CartButton from "@modules/layout/components/cart-button"
import LanguageSwitcherSlot from "@modules/layout/components/language-switcher/slot"
import NavGroupBuyEntry from "@modules/layout/components/nav-group-buy-entry"
import ProductSearch from "@modules/layout/components/product-search"
import SideMenu from "@modules/layout/components/side-menu"

type NavProps = {
  regions: StoreRegion[] | null
  currentLocale?: string | null
  dictionary: Dictionary
  isLoggedIn?: boolean
}

export default function Nav({
  regions,
  currentLocale = null,
  dictionary,
  isLoggedIn = false,
}: NavProps) {
  const safeLocale = currentLocale ?? null
  const accountLabel = isLoggedIn
    ? dictionary.landing.nav.myPage
    : dictionary.landing.nav.signIn

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu
                regions={regions}
                currentLocale={safeLocale}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="flex items-center transition-opacity hover:opacity-90"
              data-testid="nav-store-link"
            >
              <PokaCatchLogo
                variant="light"
                wordmark={dictionary.landing.brandName}
                iconSize={32}
              />
            </LocalizedClientLink>
          </div>

          <div className="hidden small:flex flex-1 justify-center px-4 max-w-sm">
            <Suspense fallback={null}>
              <ProductSearch />
            </Suspense>
          </div>

          <div className="flex items-center gap-x-3 small:gap-x-4 h-full shrink-0 justify-end">
            <div className="hidden small:flex items-center gap-x-4 h-full shrink-0">
              <LocalizedClientLink
                className="hover:text-ui-fg-base whitespace-nowrap shrink-0"
                href="/group-buying"
                data-testid="nav-group-buying-link"
              >
                {dictionary.nav.groupBuying}
              </LocalizedClientLink>
              <Suspense fallback={null}>
                <NavGroupBuyEntry />
              </Suspense>
              <LocalizedClientLink
                className="hover:text-ui-fg-base whitespace-nowrap shrink-0"
                href="/account"
                data-testid="nav-account-link"
              >
                {accountLabel}
              </LocalizedClientLink>
            </div>
            <LanguageSwitcherSlot currentLocale={safeLocale} />
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base whitespace-nowrap shrink-0"
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
