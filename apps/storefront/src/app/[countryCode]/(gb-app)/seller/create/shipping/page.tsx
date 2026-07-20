import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

type Props = {
  params: Promise<{ countryCode: string }>
}

/** Legacy route: shipping step merged into deposit flow */
export default async function LeaderCreateShippingLegacyPage(props: Props) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  redirect(gbAppRoutes.sellerCreateDeposit(resolvedCountryCode))
}
