"use client"

import { useEffect, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

const LandingNav = () => {
  const t = useDictionary()
  const [scrolled, setScrolled] = useState(false)

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
        <LocalizedClientLink href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-purple text-sm font-black text-white">
            GB
          </span>
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            {t.landing.brandName}
          </span>
        </LocalizedClientLink>

        <nav className="hidden items-center gap-8 medium:flex">
          <LocalizedClientLink
            href="/group-buying"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.groupBuys}
          </LocalizedClientLink>
          <a
            href="#categories"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.categories}
          </a>
          <a
            href="#why-us"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-pink"
          >
            {t.landing.nav.whyUs}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LocalizedClientLink
            href="/account"
            className="hidden text-sm font-medium text-neutral-600 small:inline"
          >
            {t.landing.nav.signIn}
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/group-buying"
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
