"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

type DemoDataBannerProps = {
  visible: boolean
}

const DemoDataBanner = ({ visible }: DemoDataBannerProps) => {
  const t = useDictionary()

  if (!visible) {
    return null
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-amber-900 small:px-6">
        <p>{t.landing.demoDataNotice}</p>
        <LocalizedClientLink
          href="/group-buying"
          className="font-semibold text-amber-900 underline-offset-2 hover:underline"
        >
          {t.landing.nav.searchDeals} →
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default DemoDataBanner
