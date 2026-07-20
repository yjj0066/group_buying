/**
 * @deprecated Use /my/trust-reviews (MTR0)
 */
import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

export default async function MyTrustPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(gbAppRoutes.myTrustReviews(resolveCountryCode(countryCode)))
}
