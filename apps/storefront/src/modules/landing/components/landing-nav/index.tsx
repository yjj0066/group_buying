"use client"

import { useEffect, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { PokaCatchLogo } from "@modules/common/components/pokacatch-logo"
import { useDictionary } from "@i18n/provider"

type LandingNavProps = {
  isLoggedIn?: boolean
}

const LandingNav = ({ isLoggedIn = false }: LandingNavProps) => {
  const t = useDictionary()
  const [scrolled, setScrolled] = useState(false)

  const accountLabel = isLoggedIn
    ? t.landing.nav.myPage
    : t.landing.nav.signIn

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-neutral-100 bg-white/90 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 small:px-6">
        <LocalizedClientLink href="/" className="flex items-center">
          <PokaCatchLogo
            variant="light"
            wordmark={t.landing.brandName}
            iconSize={36}
            wordmarkClassName="text-lg"
          />
        </LocalizedClientLink>

        <nav className="hidden items-center gap-8 medium:flex">
          <LocalizedClientLink
            href="/group-buying"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.groupBuys}
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/#categories"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.categories}
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/#why-us"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.whyUs}
          </LocalizedClientLink>
        </nav>

        <div className="flex items-center gap-3">
          <LocalizedClientLink
            href={isLoggedIn ? "/my" : "/account"}
            className="hidden text-sm font-medium text-neutral-600 small:inline"
          >
            {accountLabel}
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/account/group-deals/create"
            className="landing-cta-btn rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t.landing.nav.startGroupBuy}
          </LocalizedClientLink>
        </div>
      </div>
    </header>
  )
}

export default LandingNav
