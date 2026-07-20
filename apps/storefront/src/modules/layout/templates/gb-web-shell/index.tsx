"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountNav from "@modules/account/components/account-nav"
import { resolveGbAppSubpageHeader } from "@lib/wireframe/routes"
import { cn } from "@modules/design-system"
import { useParams, usePathname } from "next/navigation"

type GbWebShellProps = {
  children: React.ReactNode
}

const CHROMELESS_PREFIXES = [
  "/splash",
  "/auth/login",
  "/auth/signup",
  "/auth/bank-account",
]

const GbWebShell = ({ children }: GbWebShellProps) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const pathAfterCountry = pathname.replace(`/${countryCode}`, "") || "/"
  const subpageHeader = resolveGbAppSubpageHeader(countryCode, pathAfterCountry)
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) =>
    pathname.includes(prefix)
  )
  const isMyRoute =
    pathAfterCountry === "/my" || pathAfterCountry.startsWith("/my/")

  return (
    <main
      className={cn(
        "w-full flex-1 bg-[#F9FAFB]",
        isChromeless
          ? "content-container mx-auto flex max-w-xl flex-col py-16"
          : "content-container py-8 small:py-10"
      )}
    >
      {subpageHeader && !isChromeless && (
        <div className="mb-6">
          <LocalizedClientLink
            href={subpageHeader.backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#6B46E5]"
          >
            <span aria-hidden>←</span>
            {subpageHeader.title}
          </LocalizedClientLink>
        </div>
      )}

      {isMyRoute && !isChromeless ? (
        <div className="flex flex-col small:flex-row small:items-start gap-8">
          <div className="w-full small:w-64 shrink-0">
            <AccountNav customer={null} />
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </main>
  )
}

export default GbWebShell
