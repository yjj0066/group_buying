"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import GroupBuyingModeSwitcher from "@modules/group-buying/components/group-buying-mode-switcher"
import { useGroupBuyingMode } from "@modules/group-buying/components/group-buying-mode-provider"
import { useDictionary } from "@i18n/provider"
import { useParams, usePathname } from "next/navigation"

import { cn } from "@modules/design-system"

type GbAppHeaderProps = {
  title?: string
  showBack?: boolean
  backHref?: string
}

const GbAppHeader = ({
  title,
  showBack = false,
  backHref,
}: GbAppHeaderProps) => {
  const t = useDictionary()
  const { mode } = useGroupBuyingMode()
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const pathAfterCountry =
    pathname.replace(`/${countryCode}`, "") || "/"
  const isHome = pathAfterCountry === "/home"
  const isAuth = pathname.includes("/auth/") || pathname.includes("/splash")
  const resolvedTitle = title ?? t.gbApp.auth.logo
  const modeLabel =
    mode === "leader" ? t.gbApp.modeLeader : t.gbApp.modeParticipant

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--bb-line)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        {showBack && backHref ? (
          <LocalizedClientLink
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[var(--bb-ink)] hover:bg-[var(--bb-surface)]"
            aria-label="뒤로"
          >
            ←
          </LocalizedClientLink>
        ) : (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[var(--bb-ink)] hover:bg-[var(--bb-surface)]"
            aria-label="메뉴"
          >
            ☰
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-[var(--bb-ink)]">
            {resolvedTitle}
          </p>
          {!isAuth && (
            <p className="truncate text-[10px] font-semibold text-brand-purple">
              {modeLabel} {t.gbApp.modeActiveSuffix}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isAuth && !showBack && !isHome && (
            <GroupBuyingModeSwitcher compact className="hidden min-[380px]:flex" />
          )}
          {!isAuth && (
            <LocalizedClientLink
              href="/my/notifications"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-[var(--bb-surface)]"
              aria-label="알림"
            >
              🔔
            </LocalizedClientLink>
          )}
          <LocalizedClientLink
            href={isAuth ? `/${countryCode}/auth/login` : "/my"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-[var(--bb-surface)]"
            )}
            aria-label="마이페이지"
          >
            👤
          </LocalizedClientLink>
        </div>
      </div>
    </header>
  )
}

export default GbAppHeader
