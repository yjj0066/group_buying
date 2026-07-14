import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import { GroupDealStatus } from "../../../types/group-buying"
import {
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../utils/group-deal-store"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deals = await groupBuyingService.listGroupDeals(
    {
      status: [
        GroupDealStatus.OPEN,
        GroupDealStatus.MINIMUM_REACHED,
        GroupDealStatus.CLOSED,
      ],
    },
    {
      order: { created_at: "DESC" },
    }
  )

  const visibleDeals = deals.filter((deal) =>
    isStoreVisibleGroupDealStatus(String(deal.status))
  )

  res.json({
    group_deals: visibleDeals.map((deal) =>
      serializeStoreGroupDeal(deal as unknown as Record<string, unknown>)
    ),
  })
}
