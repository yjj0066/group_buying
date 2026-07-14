import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"

type AccountOverviewProps = {
  labels: {
    title: string
    description: string
    paymentMethods: string
    hostedDeals: string
    participations: string
    settlements: string
    preferences: string
  }
}

const links = [
  { href: "/account/payment-methods", key: "paymentMethods" as const },
  { href: "/account/group-deals/hosted", key: "hostedDeals" as const },
  { href: "/account/group-deals/participations", key: "participations" as const },
  { href: "/account/settlements", key: "settlements" as const },
  { href: "/account/preferences", key: "preferences" as const },
]

const AccountOverview = ({ labels }: AccountOverviewProps) => {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{labels.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{labels.description}</Text>
      </div>

      <div className="grid grid-cols-1 gap-3 medium:grid-cols-2">
        {links.map((link) => (
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
