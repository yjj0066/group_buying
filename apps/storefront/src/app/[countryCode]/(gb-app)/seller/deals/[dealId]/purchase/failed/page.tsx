import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import SellerPurchaseFailedView from "@modules/group-buying/components/seller-purchase-failed-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerPurchaseFailedPage(props: Props) {
  const { countryCode, dealId } = await props.params
  await requireCustomerForGbApp(resolveCountryCode(countryCode))
  const deal = await getLeaderGroupDealForPage(dealId)

  if (!deal) {
    notFound()
  }

  return <SellerPurchaseFailedView deal={deal} />
}
