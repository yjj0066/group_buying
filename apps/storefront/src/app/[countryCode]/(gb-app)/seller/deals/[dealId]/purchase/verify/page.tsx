import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Legacy alias — redirects to step 7 quantity verification route.
 */
export default async function SellerPurchaseVerifyRedirectPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const searchParams = await props.searchParams
  const resolvedCountryCode = resolveCountryCode(countryCode)
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value)
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : ""

  redirect(
    `${gbAppRoutes.sellerQuantityVerification(resolvedCountryCode, dealId)}${suffix}`
  )
}
