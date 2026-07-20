/**
 * Leader flow step 10 — 최종 정산 및 보증금 환급 신청
 * Route: /seller/deals/[dealId]/settlement
 */
import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { resolveCountryCode } from "@lib/util/country-code"
import LeaderSettlementView from "@modules/group-buying/components/leader-settlement-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerSettlementPage(props: Props) {
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

  return <LeaderSettlementView deal={deal} participations={participations} />
}
