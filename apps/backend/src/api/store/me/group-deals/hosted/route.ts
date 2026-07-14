import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { serializeAccountGroupDeal } from "../../../../../utils/group-deal-account"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deals = await groupBuyingService.listGroupDeals(
    {
      leader_customer_id: customerId,
    },
    {
      order: { created_at: "DESC" },
    }
  )

  res.json({
    group_deals: deals.map((deal) =>
      serializeAccountGroupDeal(deal as unknown as Record<string, unknown>)
    ),
  })
}
