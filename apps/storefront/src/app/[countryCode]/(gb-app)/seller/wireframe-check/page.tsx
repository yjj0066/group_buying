import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import SellerWireframeCheckView from "@modules/group-buying/components/seller-wireframe-check-view"

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function SellerWireframeCheckPage(props: Props) {
  const { countryCode } = await props.params

  await requireCustomerForGbApp(resolveCountryCode(countryCode))

  return <SellerWireframeCheckView />
}
