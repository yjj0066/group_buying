/**
 * Leader flow step 8 — 수동 배분 조정
 * Route: /seller/deals/[dealId]/manual-distribution
 */
import { notFound } from "next/navigation"

import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import LeaderManualDistributionView from "@modules/group-buying/components/leader-manual-distribution"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerManualDistributionPage(props: Props) {
  const { countryCode, dealId } = await props.params
  await requireCustomerForGbApp(resolveCountryCode(countryCode))
  const deal = await getLeaderGroupDealForPage(dealId)

  if (!deal) {
    notFound()
  }

  const participations = await listHostedDealParticipations(
    dealId,
    deal.deal_price
  )

  return (
    <LeaderManualDistributionView deal={deal} participations={participations} />
  )
}
