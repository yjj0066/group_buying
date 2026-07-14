import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { serializeAccountParticipation } from "../../../../../utils/group-deal-account"

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

  const participants = await groupBuyingService.listGroupDealParticipants(
    {
      customer_id: customerId,
    },
    {
      order: { created_at: "DESC" },
    }
  )

  const participations = await Promise.all(
    participants.map(async (participant) => {
      const deal = await groupBuyingService.retrieveGroupDeal(
        String(participant.group_deal_id)
      )

      return serializeAccountParticipation({
        participant: participant as unknown as Record<string, unknown>,
        deal: deal as unknown as Record<string, unknown>,
      })
    })
  )

  res.json({
    participations,
  })
}
