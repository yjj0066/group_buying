import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"
import { GroupDealParticipantStatus } from "../../../../../../../types/group-buying"
import {
  resolveParticipationStage,
  serializeAccountParticipation,
} from "../../../../../../../utils/group-deal-account"
import { vacateParticipantSlotWorkflow } from "../../../../../../../workflows/group-deal-escrow"

const NON_CANCELLABLE_STAGES = new Set([
  "purchasing",
  "opening",
  "shipping",
  "delivery_confirmed",
])

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

  return { participant, deal, groupBuyingService }
}

const assertParticipantCancellable = (
  participant: Record<string, unknown>,
  deal: Record<string, unknown>
) => {
  const status = String(participant.status ?? "")

  if (status === GroupDealParticipantStatus.CANCELLED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This participation is already cancelled"
    )
  }

  if (participant.delivery_confirmed_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot cancel after delivery has been confirmed"
    )
  }

  const stage = resolveParticipationStage({ participant, deal })

  if (NON_CANCELLABLE_STAGES.has(stage)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot cancel after the group buy purchase or shipping has started"
    )
  }
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

  const participantRecord = resolved.participant as unknown as Record<
    string,
    unknown
  >
  const dealRecord = resolved.deal as unknown as Record<string, unknown>

  assertParticipantCancellable(participantRecord, dealRecord)

  await vacateParticipantSlotWorkflow(req.scope).run({
    input: {
      participant_id: req.params.id,
      reason: "participant_requested",
      auto_match_waitlist: true,
    },
  })

  const updatedParticipant =
    await resolved.groupBuyingService.retrieveGroupDealParticipant(req.params.id)
  const updatedDeal = await resolved.groupBuyingService.retrieveGroupDeal(
    String(updatedParticipant.group_deal_id)
  )

  const participation = serializeAccountParticipation({
    participant: updatedParticipant as unknown as Record<string, unknown>,
    deal: updatedDeal as unknown as Record<string, unknown>,
  })

  res.status(200).json({ participation })
}
