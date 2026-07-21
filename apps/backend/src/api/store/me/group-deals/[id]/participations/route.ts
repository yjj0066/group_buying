import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { GroupDealParticipantStatus } from "../../../../../../types/group-buying"
import { serializeAccountParticipation } from "../../../../../../utils/group-deal-account"

const EXCLUDED_PARTICIPANT_STATUSES = new Set<string>([
  GroupDealParticipantStatus.CANCELLED,
  GroupDealParticipantStatus.CAPTURE_FAILED,
])

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

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the deal leader can view hosted deal participations"
    )
  }

  const participants = await groupBuyingService.listGroupDealParticipants({
    group_deal_id: req.params.id,
  })

  const activeParticipants = participants.filter(
    (participant) =>
      !EXCLUDED_PARTICIPANT_STATUSES.has(String(participant.status ?? ""))
  )

  const participations = activeParticipants.map((participant) =>
    serializeAccountParticipation({
      participant: participant as unknown as Record<string, unknown>,
      deal: deal as unknown as Record<string, unknown>,
    })
  )

  res.json({ participations })
}
