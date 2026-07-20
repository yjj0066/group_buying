"use client"



import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {

  GB_MY_FLOW_TAB_KEYS,

  getGbTabItems,

  getGbTabItemsFromKeys,

  isMyFlowTabRoute,

} from "@lib/wireframe/routes"

import { useDictionary } from "@i18n/provider"

import { useGroupBuyingMode } from "@modules/group-buying/components/group-buying-mode-provider"

import { cn } from "@modules/design-system"

import { useParams, usePathname } from "next/navigation"



const HIDE_TAB_PREFIXES = [

  "/splash",

  "/auth/login",

  "/auth/signup",

  "/auth/bank-account",

  "/deals/",

  "/seller/deals/",

  "/reviews/new",

  "/disputes/new",

  "/waitlist",

]



const GbAppTabBar = () => {

  const t = useDictionary()

  const { mode } = useGroupBuyingMode()

  const pathname = usePathname()

  const { countryCode } = useParams() as { countryCode: string }

  const pathAfterCountry = pathname.replace(`/${countryCode}`, "") || "/"

  const tabs = isMyFlowTabRoute(pathAfterCountry)

    ? getGbTabItemsFromKeys(GB_MY_FLOW_TAB_KEYS)

    : getGbTabItems(mode)



  const hidden = HIDE_TAB_PREFIXES.some((prefix) =>

    pathAfterCountry.startsWith(prefix)

  )



  if (hidden) {

    return null

  }



  const tabLabels = t.gbApp.tabs



  return (

    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white md:hidden"
      aria-label={t.gbApp.tabBarAria}
    >
      <div
        className={cn(
          "mx-auto grid max-w-5xl px-1 pb-[env(safe-area-inset-bottom)] pt-1",

          tabs.length <= 4 ? "grid-cols-4" : "grid-cols-5"

        )}

      >

        {tabs.map((tab) => {

          const active = tab.matchPrefixes.some((prefix) =>

            pathAfterCountry.startsWith(prefix)

          )



          return (

            <LocalizedClientLink

              key={tab.key}

              href={tab.href(countryCode).replace(`/${countryCode}`, "")}

              className={cn(

                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-colors",

                active

                  ? "text-[#6B46E5]"

                  : "text-[#9CA3AF] hover:text-[#4B5563]"

              )}

            >

              <span className="text-[11px] font-bold">

                {tabLabels[tab.labelKey]}

              </span>

              {active && (

                <span className="h-0.5 w-4 rounded-full bg-[#6B46E5]" />

              )}

            </LocalizedClientLink>

          )

        })}

      </div>

    </nav>

  )

}



export default GbAppTabBar

