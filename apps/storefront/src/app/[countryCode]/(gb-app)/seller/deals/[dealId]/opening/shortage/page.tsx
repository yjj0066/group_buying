import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { resolveCountryCode } from "@lib/util/country-code"
import SellerOpeningShortageView from "@modules/group-buying/components/seller-opening-shortage-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerOpeningShortagePage(props: Props) {
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
    <SellerOpeningShortageView deal={deal} participations={participations} />
  )
}
