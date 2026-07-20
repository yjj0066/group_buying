import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"

type Props = {
  params: Promise<{ countryCode: string }>
}

/** Legacy route: merged into product step */
export default async function LeaderCreateRecruitmentLegacyPage(props: Props) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  redirect(gbAppRoutes.sellerCreateProduct(resolvedCountryCode))
}
