import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { buildSettlementRecords } from "../../../../../utils/group-deal-account"

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

  const hostedDeals = await groupBuyingService.listGroupDeals({
    leader_customer_id: customerId,
  })
  const participants = await groupBuyingService.listGroupDealParticipants({
    customer_id: customerId,
  })

  const participations = await Promise.all(
    participants.map(async (participant) => {
      const deal = await groupBuyingService.retrieveGroupDeal(
        String(participant.group_deal_id)
      )

      return {
        participant: participant as unknown as Record<string, unknown>,
        deal: deal as unknown as Record<string, unknown>,
      }
    })
  )

  const settlements = buildSettlementRecords({
    hostedDeals: hostedDeals as unknown as Record<string, unknown>[],
    participations,
  })

  res.json({ settlements })
}
