import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import {
  loadHostedDealsByLeaderCustomerIds,
  resolveStoreGroupDealLeaderContext,
} from "../../../utils/enrich-store-group-deal-leader-context"
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

  const leaderCustomerIds = [
    ...new Set(
      visibleDeals
        .map((deal) =>
          deal.leader_customer_id != null
            ? String(deal.leader_customer_id)
            : null
        )
        .filter((value): value is string => Boolean(value))
    ),
  ]

  const hostedDealsByLeaderId = await loadHostedDealsByLeaderCustomerIds(
    groupBuyingService,
    leaderCustomerIds
  )

  return Promise.all(
    visibleDeals.map(async (deal) => {
      const options = await groupBuyingService.listDealOptions(String(deal.id))
      const dealRecord = deal as unknown as Record<string, unknown>
      const serialized = serializeStoreGroupDeal(
        dealRecord,
        options as unknown as Record<string, unknown>[]
      )
      const leaderCustomerId = serialized.leader_customer_id
      const leaderContext = resolveStoreGroupDealLeaderContext(
        {
          id: String(deal.id),
          leader_customer_id: leaderCustomerId,
        },
        leaderCustomerId
          ? hostedDealsByLeaderId.get(leaderCustomerId) ?? []
          : []
      )

      return {
        ...serialized,
        ...leaderContext,
      }
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
