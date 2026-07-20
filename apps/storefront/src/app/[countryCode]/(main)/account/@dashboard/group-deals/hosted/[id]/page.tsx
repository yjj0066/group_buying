import { notFound, redirect } from "next/navigation"

import { listHostedGroupDeals } from "@lib/data/account-group-deals"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

type Props = {
  params: Promise<{ countryCode: string; id: string }>
}

export default async function HostedDealDashboardPage(props: Props) {
  const params = await props.params
  const countryCode = resolveCountryCode(params.countryCode)
  const deals = await listHostedGroupDeals()
  const deal = deals.find((item) => item.id === params.id)

  if (!deal) {
    notFound()
  }

  redirect(gbAppRoutes.sellerDeal(countryCode, deal.id))
}
