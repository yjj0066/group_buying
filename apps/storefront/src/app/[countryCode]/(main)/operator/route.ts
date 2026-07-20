import { redirect } from "next/navigation"

import { resolveCountryCode } from "@lib/util/country-code"

const DEFAULT_ADMIN_URL = "http://localhost:9000/app"

export async function GET(
  _request: Request,
  context: { params: Promise<{ countryCode: string }> }
) {
  const params = await context.params
  const countryCode = resolveCountryCode(params.countryCode)
  const adminUrl =
    process.env.MEDUSA_ADMIN_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_ADMIN_URL ||
    DEFAULT_ADMIN_URL

  redirect(adminUrl || `/${countryCode}/home`)
}
