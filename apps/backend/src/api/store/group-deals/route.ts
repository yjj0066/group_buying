import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { queryGroupDeals } from "../../../utils/query-group-deals"
import { GroupDealStatus } from "../../../types/group-buying"
import { JOINABLE_DEAL_STATUSES } from "../../../utils/group-deal-rules"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupDeals = await queryGroupDeals(req.scope, {
    status: undefined,
  })

  const joinableDeals = groupDeals.filter((deal) =>
    JOINABLE_DEAL_STATUSES.includes(deal.status as GroupDealStatus)
  )

  res.json({ group_deals: joinableDeals })
}
