import { getLandingHomeData } from "@lib/util/landing-deals"

import LandingPageClient from "./landing-page-client"

const LandingPageTemplate = async () => {
  const data = await getLandingHomeData()

  return <LandingPageClient data={data} />
}

export default LandingPageTemplate
