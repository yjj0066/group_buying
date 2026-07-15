import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import {
  isDepositSecured,
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../utils/group-deal-store"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const navigationMode = req.query.navigation === "true"

  const deals = await groupBuyingService.listGroupDeals()

  const visibleDeals = deals.filter((deal) => {
    const status = String(deal.status)
    const depositOk =
      navigationMode ||
      isDepositSecured(deal as { deposit_status?: string | null })

    return isStoreVisibleGroupDealStatus(status) && depositOk
  })

  const serialized = await Promise.all(
    visibleDeals.map(async (deal) => {
      const options = await groupBuyingService.listDealOptions(String(deal.id))

      return serializeStoreGroupDeal(
        deal as unknown as Record<string, unknown>,
        options as unknown as Record<string, unknown>[]
      )
    })
  )

  res.json({
    group_deals: serialized,
  })
}
