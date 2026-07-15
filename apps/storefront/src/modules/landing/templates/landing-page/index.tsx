import { getLandingHomeData } from "@lib/util/landing-deals"
import { resolveCountryCode } from "@lib/util/country-code"

import AiRecommendationsRail from "@modules/landing/components/ai-recommendations-rail"
import LandingPageClient from "./landing-page-client"

type LandingPageTemplateProps = {
  countryCode?: string
}

const LandingPageTemplate = async ({
  countryCode = "kr",
}: LandingPageTemplateProps) => {
  const data = await getLandingHomeData()
  const resolvedCountry = resolveCountryCode(countryCode)

  return (
    <>
      <LandingPageClient data={data} />
      <AiRecommendationsRail countryCode={resolvedCountry} />
    </>
  )
}
export default LandingPageTemplate
