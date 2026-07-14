import { listGroupDeals } from "@lib/data/group-deals"
import GroupDealsCatalog from "@modules/group-buying/components/group-deals-catalog"

type GroupDealsListTemplateProps = {
  countryCode: string
}

const GroupDealsListTemplate = async ({
  countryCode: _countryCode,
}: GroupDealsListTemplateProps) => {
  const { group_deals: deals } = await listGroupDeals()

  return <GroupDealsCatalog deals={deals} />
}

export default GroupDealsListTemplate
