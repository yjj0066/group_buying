import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function LeaderCreateIndexPage(props: Props) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  redirect(gbAppRoutes.sellerCreateBasic(resolvedCountryCode))
}
