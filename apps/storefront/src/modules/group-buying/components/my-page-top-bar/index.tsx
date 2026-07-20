"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { useParams } from "next/navigation"

const MyPageTopBar = () => {
  const t = useDictionary()
  const { countryCode } = useParams() as { countryCode: string }
  const gb = t.gbApp

  return (
    <header className="sticky top-0 z-40 -mx-4 border-b border-[var(--bb-line)] bg-white/95 px-4 backdrop-blur-md small:-mx-6 small:px-6">
      <div className="flex h-14 items-center gap-3">
        <LocalizedClientLink href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink to-brand-purple text-xs font-black text-white">
            GB
          </span>
          <span className="text-sm font-black text-[var(--bb-ink)]">
            {gb.auth.logo}
          </span>
        </LocalizedClientLink>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-black text-[var(--bb-ink)]">
            {gb.myHubTitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <LocalizedClientLink
            href={gbAppRoutes.myNotifications(countryCode).replace(
              `/${countryCode}`,
              ""
            )}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base hover:bg-[var(--bb-surface)]"
            aria-label={gb.notificationsAria}
          >
            <span aria-hidden>🔔</span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href={gbAppRoutes.myProfile(countryCode).replace(
              `/${countryCode}`,
              ""
            )}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base hover:bg-[var(--bb-surface)]"
            aria-label={gb.settingsAria}
          >
            <span aria-hidden>⚙</span>
          </LocalizedClientLink>
        </div>
      </div>
    </header>
  )
}

export default MyPageTopBar
