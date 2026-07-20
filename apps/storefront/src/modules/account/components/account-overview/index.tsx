import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { Text } from "@modules/common/components/ui"

import CustomerProfileSummary from "@modules/account/components/customer-profile-summary"
import RoleSwitcher from "@modules/account/components/role-switcher"

import type { PreferredRole } from "types/account-group-deals"
import type { HttpTypes } from "@medusajs/types"

type AccountOverviewProps = {
  customer: HttpTypes.StoreCustomer
  labels: {
    title: string
    description: string
    hubTitle: string
    hubSearchVacant: string
    hubCreateDeal: string
    bankAccount: string
    hostedDeals: string
    participations: string
    settlements: string
    trustReviews: string
    profile: string
    preferences: string
    customerService: string
  }
  preferredRole: PreferredRole
}

const hubLinks = [
  { href: "/group-buying?vacant=1", key: "hubSearchVacant" as const },
  { href: "/account/group-deals/create", key: "hubCreateDeal" as const },
]

const accountLinks = [
  { href: "/account/bank-account", key: "bankAccount" as const },
  { href: "/account/group-deals/hosted", key: "hostedDeals" as const },
  { href: "/account/group-deals/participations", key: "participations" as const },
  { href: "/account/settlements", key: "settlements" as const },
  { href: "/account/trust-reviews", key: "trustReviews" as const },
  { href: "/account/profile", key: "profile" as const },
  { href: "/account/preferences", key: "preferences" as const },
  { href: "/account/customer-service", key: "customerService" as const },
]

const AccountOverview = ({
  customer,
  labels,
  preferredRole,
}: AccountOverviewProps) => {
  return (
    <div className="flex flex-col gap-y-6">
      <CustomerProfileSummary customer={customer} />

      <div>
        <h1 className="text-2xl-semi">{labels.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{labels.description}</Text>
      </div>

      <RoleSwitcher initialRole={preferredRole} />

      <div>
        <Text className="font-medium">{labels.hubTitle}</Text>
        <div className="mt-3 grid grid-cols-1 gap-3 medium:grid-cols-2">
          {hubLinks.map((link) => (
            <LocalizedClientLink
              key={link.href}
              href={link.href}
              className="rounded-xl border border-ui-border-base p-5 transition-colors hover:border-ui-border-interactive"
            >
              <Text className="font-medium">{labels[link.key]}</Text>
            </LocalizedClientLink>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 medium:grid-cols-2">
        {accountLinks.map((link) => (
          <LocalizedClientLink
            key={link.href}
            href={link.href}
            className="rounded-xl border border-ui-border-base p-5 transition-colors hover:border-ui-border-interactive"
          >
            <Text className="font-medium">{labels[link.key]}</Text>
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default AccountOverview
