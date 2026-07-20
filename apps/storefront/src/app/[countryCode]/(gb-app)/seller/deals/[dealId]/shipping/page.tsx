/**

 * [SHIP] 배송 준비 및 운송장 등록 (Leader Step 9)

 * Wireframe ID: SHIP | 도메인: 총대 | 우선순위: P0

 */

import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { resolveCountryCode } from "@lib/util/country-code"
import LeaderShippingPrepView from "@modules/group-buying/components/leader-shipping-prep-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerShippingPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  await requireCustomerForGbApp(resolvedCountryCode)

  const deal = await getLeaderGroupDealForPage(dealId)

  if (!deal) {
    notFound()
  }

  const participations = await listHostedDealParticipations(
    dealId,
    deal.deal_price
  )

  return (
    <LeaderShippingPrepView deal={deal} participations={participations} />
  )
}
