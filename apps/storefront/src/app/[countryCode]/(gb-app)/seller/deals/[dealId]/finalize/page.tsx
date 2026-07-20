/**
 * [FINL] 모집 마감·주문 명단 확정 (Step 5)
 * Wireframe ID: FINL | 도메인: 총대 | 우선순위: P0
 */
import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { resolveCountryCode } from "@lib/util/country-code"
import SellerFinalizeView from "@modules/group-buying/components/seller-finalize-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerFinalizePage(props: Props) {
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

  return <SellerFinalizeView deal={deal} participations={participations} />
}
