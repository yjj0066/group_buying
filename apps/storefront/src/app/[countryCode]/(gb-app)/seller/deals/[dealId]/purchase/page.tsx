import { redirect } from "next/navigation"

import { resolveCountryCode } from "@lib/util/country-code"
import { gbAppRoutes } from "@lib/wireframe/routes"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerPurchaseRedirectPage(props: Props) {
  const { countryCode, dealId } = await props.params

  redirect(gbAppRoutes.sellerPurchaseProof(resolveCountryCode(countryCode), dealId))
}
