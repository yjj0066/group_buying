import { redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { resolveCountryCode } from "@lib/util/country-code"
import { gbAppRoutes } from "@lib/wireframe/routes"

export default async function SellerCreateLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const resolvedCountryCode = resolveCountryCode(countryCode)
  const customer = await retrieveCustomer()

  if (!customer) {
    const returnTo = encodeURIComponent(
      gbAppRoutes.sellerCreateBasic(resolvedCountryCode)
    )

    redirect(
      `${gbAppRoutes.login(resolvedCountryCode)}?returnTo=${returnTo}`
    )
  }

  return children
}
