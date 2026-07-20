/**
 * [SGN] 회원가입 (3단계)
 * Wireframe ID: SGN | 도메인: 공통·인증 | 우선순위: P0
 */
import { isGbAppOnboardingComplete } from "@lib/util/group-buying-preferences"
import { retrieveCustomer } from "@lib/data/customer"
import { resolveCountryCode } from "@lib/util/country-code"
import { gbAppRoutes } from "@lib/wireframe/routes"
import GbAppSignupWizard from "@modules/group-buying/components/gb-app-signup-wizard"
import { redirect } from "next/navigation"

type SignupPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function SignupPage({ params }: SignupPageProps) {
  const { countryCode } = await params
  const resolvedCountryCode = resolveCountryCode(countryCode)
  const customer = await retrieveCustomer()
  const metadata = (customer?.metadata ?? null) as Record<
    string,
    unknown
  > | null

  if (customer && isGbAppOnboardingComplete(metadata)) {
    redirect(gbAppRoutes.home(resolvedCountryCode))
  }

  return (
    <GbAppSignupWizard
      countryCode={resolvedCountryCode}
      resume={Boolean(customer)}
    />
  )
}
