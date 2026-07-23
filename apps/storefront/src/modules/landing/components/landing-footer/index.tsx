"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { PokaCatchLogo } from "@modules/common/components/pokacatch-logo"
import { useDictionary } from "@i18n/provider"

type LandingFooterProps = {
  isLoggedIn?: boolean
}

const LandingFooter = ({ isLoggedIn = false }: LandingFooterProps) => {
  const t = useDictionary()

  const accountLabel = isLoggedIn
    ? t.landing.nav.myPage
    : t.landing.nav.signIn

  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 small:px-6">
        <div className="grid gap-10 medium:grid-cols-4">
          <div className="medium:col-span-2">
            <PokaCatchLogo
              variant="light"
              wordmark={t.landing.brandName}
              iconSize={36}
              wordmarkClassName="text-lg"
            />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-500">
              {t.landing.footer.tagline}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-900">
              {t.landing.footer.explore}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li>
                <LocalizedClientLink href="/store" className="hover:text-brand-pink">
                  {t.nav.allProducts}
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/group-buying" className="hover:text-brand-pink">
                  {t.landing.nav.groupBuys}
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href={isLoggedIn ? "/my" : "/account"}
                  className="hover:text-brand-pink"
                >
                  {accountLabel}
                </LocalizedClientLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-900">
              {t.landing.footer.support}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li>{t.landing.footer.securePayment}</li>
              <li>{t.landing.footer.authenticGoods}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-100 pt-8 text-center text-xs text-neutral-400">
          {t.landing.footer.copyright}
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
