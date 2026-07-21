import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import {
  isStoreVisibleGroupDeal,
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../utils/group-deal-store"

const loadVisibleStoreGroupDeals = async (
  groupBuyingService: GroupBuyingModuleService
) => {
  const deals = await groupBuyingService.listGroupDeals({})

  const visibleDeals = deals.filter((deal) => {
    const record = deal as unknown as Record<string, unknown>

    if (!isStoreVisibleGroupDeal(record)) {
      return false
    }

    return isStoreVisibleGroupDealStatus(String(deal.status ?? ""))
  })

  return Promise.all(
    visibleDeals.map(async (deal) => {
      const options = await groupBuyingService.listDealOptions(String(deal.id))

      return serializeStoreGroupDeal(
        deal as unknown as Record<string, unknown>,
        options as unknown as Record<string, unknown>[]
      )
    })
  )
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const group_deals = await loadVisibleStoreGroupDeals(groupBuyingService)

  res.status(200).json({ group_deals })
}
