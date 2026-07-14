import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"
import { serializeAccountParticipation } from "../../../../../../../utils/group-deal-account"
import { confirmParticipantDeliveryWorkflow } from "../../../../../../../workflows/group-deal-escrow"

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

  const participant = await groupBuyingService.retrieveGroupDealParticipant(
    req.params.id
  )

  if (participant.customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only confirm delivery for your own participation"
    )
  }

  const { result } = await confirmParticipantDeliveryWorkflow(req.scope).run({
    input: {
      participant_id: participant.id,
    },
  })

  const deal = await groupBuyingService.retrieveGroupDeal(
    String(participant.group_deal_id)
  )

  res.json({
    participation: serializeAccountParticipation({
      participant: result.participant as unknown as Record<string, unknown>,
      deal: deal as unknown as Record<string, unknown>,
    }),
    all_delivery_confirmed: result.all_delivery_confirmed,
    settlement: result.settlement,
  })
}
