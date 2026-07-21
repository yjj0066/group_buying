import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { confirmParticipantDeliveryWorkflow } from "../../../../../../../workflows/group-deal-escrow"
import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"
import { serializeAccountParticipation } from "../../../../../../../utils/group-deal-account"

const resolveParticipant = async (
  req: AuthenticatedMedusaRequest,
  participantId: string
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return null
  }

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const participant = await groupBuyingService.retrieveGroupDealParticipant(
    participantId
  )

  if (String(participant.customer_id ?? "") !== customerId) {
    return null
  }

  const deal = await groupBuyingService.retrieveGroupDeal(
    String(participant.group_deal_id)
  )

  return { participant, deal }
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const resolved = await resolveParticipant(req, req.params.id)

  if (!resolved) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { result } = await confirmParticipantDeliveryWorkflow(req.scope).run({
    input: { participant_id: req.params.id },
  })

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(
    String(result.participant.group_deal_id)
  )

  const participation = serializeAccountParticipation({
    participant: result.participant as unknown as Record<string, unknown>,
    deal: updatedDeal as unknown as Record<string, unknown>,
  })

  res.status(200).json({
    participation,
    all_delivery_confirmed: result.all_delivery_confirmed,
    settlement: result.settlement,
  })
}
