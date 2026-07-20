"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import GroupBuyingModeSwitcher from "@modules/group-buying/components/group-buying-mode-switcher"
import { useGroupBuyingMode } from "@modules/group-buying/components/group-buying-mode-provider"
import { useDictionary } from "@i18n/provider"
import { getGbTabItems } from "@lib/wireframe/routes"
import { cn } from "@modules/design-system"
import { useParams, usePathname } from "next/navigation"

type GbWebNavProps = {
  isLoggedIn?: boolean
}

const GbWebNav = ({ isLoggedIn = false }: GbWebNavProps) => {
  const t = useDictionary()
  const { mode } = useGroupBuyingMode()
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const pathAfterCountry = pathname.replace(`/${countryCode}`, "") || "/"
  const appTabs = getGbTabItems(mode)
  const tabLabels = t.gbApp.tabs

  const accountLabel = isLoggedIn
    ? t.landing.nav.myPage
    : t.landing.nav.signIn

  if (pathAfterCountry === "/my" || pathAfterCountry.startsWith("/seller/")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
      <div className="content-container flex h-16 items-center justify-between gap-6">
        <LocalizedClientLink href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B46E5] text-xs font-black text-white">
            GB
          </span>
          <span className="text-lg font-bold tracking-tight text-[#111827]">
            {t.landing.brandName}
          </span>
        </LocalizedClientLink>

        <nav className="hidden flex-1 items-center justify-center gap-8 sm:flex">
          {appTabs.map((tab) => {
            const active = tab.matchPrefixes.some((prefix) =>
              pathAfterCountry.startsWith(prefix)
            )
            const href = tab.href(countryCode).replace(`/${countryCode}`, "")

            return (
              <LocalizedClientLink
                key={tab.key}
                href={href}
                className={cn(
                  "text-sm transition-colors",
                  active
                    ? "font-bold text-[#6B46E5]"
                    : "font-medium text-[#6B7280] hover:text-[#6B46E5]"
                )}
              >
                {tabLabels[tab.labelKey]}
              </LocalizedClientLink>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <GroupBuyingModeSwitcher compact className="hidden sm:flex" />
          <LocalizedClientLink
            href={isLoggedIn ? "/my" : "/account"}
            className="text-sm font-medium text-[#6B7280] transition-colors hover:text-[#6B46E5]"
          >
            {accountLabel}
          </LocalizedClientLink>
        </div>
      </div>
    </header>
  )
}

export default GbWebNav
