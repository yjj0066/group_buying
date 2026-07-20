"use client"

import { useParams, usePathname } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { cn } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

const LeaderAccountSidebar = () => {
  const t = useDictionary()
  const menu = t.gbApp.myMenu
  const nav = t.account.nav
  const { countryCode } = useParams() as { countryCode: string }
  const pathname = usePathname()

  const items = [
    {
      href: gbAppRoutes.myAccount(countryCode),
      label: menu.bankAccount,
    },
    {
      href: gbAppRoutes.myHosted(countryCode),
      label: menu.hostedDeals,
    },
    {
      href: gbAppRoutes.myParticipations(countryCode),
      label: menu.participations,
    },
    {
      href: gbAppRoutes.mySettlements(countryCode),
      label: menu.settlements,
    },
    {
      href: gbAppRoutes.sellerCreateBasic(countryCode),
      label: nav.createGroupDeal,
    },
    ...(process.env.NODE_ENV === "development"
      ? [
          {
            href: gbAppRoutes.sellerWireframeCheck(countryCode),
            label: "화면 점검 (PURC-F·OPEN)",
          },
        ]
      : []),
  ]

  const toRelativePath = (href: string) => href.replace(`/${countryCode}`, "")

  return (
    <aside>
      <Text className="mb-4 text-sm font-bold text-[#111827]">{nav.account}</Text>
      <nav className="flex flex-col gap-3">
        {items.map((item) => {
          const relativeHref = toRelativePath(item.href)
          const isActive = pathname.includes(relativeHref)

          return (
            <LocalizedClientLink
              key={item.href}
              href={relativeHref}
              className={cn(
                "text-sm transition-colors",
                isActive
                  ? "font-semibold text-[#6B46E5]"
                  : "text-[#6B7280] hover:text-[#6B46E5]"
              )}
            >
              {item.label}
            </LocalizedClientLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default LeaderAccountSidebar
