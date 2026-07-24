/**
 * [LGN] 로그인
 * Wireframe ID: LGN | 도메인: 공통·인증 | 우선순위: P0
 */
import GbAppLoginForm from "@modules/group-buying/components/gb-app-login-form"
import { resolveCountryCode } from "@lib/util/country-code"

type LoginPageProps = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { countryCode } = await params
  const { returnTo } = await searchParams

  return (
    <GbAppLoginForm
      countryCode={resolveCountryCode(countryCode)}
      returnTo={returnTo ?? null}
    />
  )
}
