/**
 * [SPL] 스플래시
 * Wireframe ID: SPL | 도메인: 공통·인증 | 우선순위: P0
 */
import GbAppSplash from "@modules/group-buying/components/gb-app-splash"
import { resolveCountryCode } from "@lib/util/country-code"

type SplashPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function SplashPage({ params }: SplashPageProps) {
  const { countryCode } = await params

  return <GbAppSplash countryCode={resolveCountryCode(countryCode)} />
}
