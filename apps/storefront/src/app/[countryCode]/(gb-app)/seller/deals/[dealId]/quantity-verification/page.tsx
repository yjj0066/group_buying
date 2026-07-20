/**
 * Leader flow step 7 — 구매 수량 자동 검증 및 부족분 처리
 * Route: /seller/deals/[dealId]/quantity-verification
 */
import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { resolveCountryCode } from "@lib/util/country-code"
import LeaderPurchaseQuantityVerify from "@modules/group-buying/components/leader-purchase-quantity-verify"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerQuantityVerificationPage(props: Props) {
  const { countryCode, dealId } = await props.params
  await requireCustomerForGbApp(resolveCountryCode(countryCode))
  const deal = await getLeaderGroupDealForPage(dealId)

  if (!deal) {
    notFound()
  }

  const participations = await listHostedDealParticipations(dealId, deal.deal_price)

  return (
    <LeaderPurchaseQuantityVerify deal={deal} participations={participations} />
  )
}
