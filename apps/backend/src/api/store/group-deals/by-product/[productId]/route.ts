import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import {
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../../../utils/group-deal-store"
import { resolveLeaderHostingStats } from "../../../../../utils/group-deal-leader-stats"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const productId = req.params.productId

  const deals = await groupBuyingService.listGroupDeals({
    product_id: productId,
  })

  const deal = deals.find(
    (item) => String(item.product_id) === productId
  )

  if (!deal || !isStoreVisibleGroupDealStatus(String(deal.status))) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal for product ${productId} was not found`
    )
  }

  const options = await groupBuyingService.listDealOptions(String(deal.id))

  const serialized = serializeStoreGroupDeal(
    deal as unknown as Record<string, unknown>,
    options as unknown as Record<string, unknown>[]
  )

  const leaderStats = await resolveLeaderHostingStats(groupBuyingService, {
    id: String(deal.id),
    leader_customer_id: serialized.leader_customer_id,
  })

  res.json({
    group_deal: {
      ...serialized,
      ...leaderStats,
    },
  })
}
