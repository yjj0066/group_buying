/**
 * [LGN] 로그인
 * Wireframe ID: LGN | 도메인: 공통·인증 | 우선순위: P0
 */
import GbAppLoginForm from "@modules/group-buying/components/gb-app-login-form"
import { resolveCountryCode } from "@lib/util/country-code"

type LoginPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { countryCode } = await params

  return <GbAppLoginForm countryCode={resolveCountryCode(countryCode)} />
}
