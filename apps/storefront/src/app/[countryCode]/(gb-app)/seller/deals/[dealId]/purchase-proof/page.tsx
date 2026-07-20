import { notFound } from "next/navigation"

import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import SellerPurchaseView from "@modules/group-buying/components/seller-purchase-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerPurchaseProofPage(props: Props) {
  const { countryCode, dealId } = await props.params
  await requireCustomerForGbApp(resolveCountryCode(countryCode))
  const deal = await getLeaderGroupDealForPage(dealId)

  if (!deal) {
    notFound()
  }

  return <SellerPurchaseView deal={deal} />
}
