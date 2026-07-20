import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"

export const POST = async (
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

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the deal leader can register urgent fill"
    )
  }

  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

  await groupBuyingService.updateGroupDeals({
    id: req.params.id,
    metadata: {
      ...metadata,
      urgent_fill: true,
      urgent_fill_at: new Date().toISOString(),
    },
  })

  res.json({
    group_deal_id: req.params.id,
    urgent_fill: true,
  })
}
