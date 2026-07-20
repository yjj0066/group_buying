import { Metadata } from "next"

import { getGroupBuyingMode } from "@lib/data/group-buying-mode"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale"
import { listRegions } from "@lib/data/regions"
import { getServerDictionary } from "@i18n/server"
import { I18nProvider } from "@i18n/provider"
import { StoreRegion } from "@medusajs/types"
import GroupBuyingModeProvider from "@modules/group-buying/components/group-buying-mode-provider"
import Nav from "@modules/layout/templates/nav"
import GbWebShell from "@modules/layout/templates/gb-web-shell"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: {
      template: `%s | ${dictionary.landing.brandName}`,
      default: dictionary.landing.brandName,
    },
  }
}

export default async function GbAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [dictionary, initialMode, customer, regions, currentLocale] =
    await Promise.all([
      getServerDictionary(),
      getGroupBuyingMode(),
      retrieveCustomer().catch(() => null),
      listRegions()
        .then((items: StoreRegion[]) => items)
        .catch(() => [] as StoreRegion[]),
      getLocale().catch(() => null),
    ])

  const isLoggedIn = Boolean(customer)

  return (
    <I18nProvider dictionary={dictionary}>
      <GroupBuyingModeProvider initialMode={initialMode}>
        <div className="flex min-h-screen flex-col bg-[#F9FAFB] text-[#111827]">
          <Nav
            regions={regions}
            currentLocale={currentLocale}
            dictionary={dictionary}
            isLoggedIn={isLoggedIn}
          />
          <GbWebShell>{children}</GbWebShell>
        </div>
      </GroupBuyingModeProvider>
    </I18nProvider>
  )
}
