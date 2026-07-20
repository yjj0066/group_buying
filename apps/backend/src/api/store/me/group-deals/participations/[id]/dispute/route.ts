import { z } from "zod"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"

const PostParticipationDispute = z.object({
  reason: z.string().min(1).max(2000),
  details: z.string().max(5000).optional(),
})

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

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = PostParticipationDispute.parse(req.body ?? {})
  const resolved = await resolveParticipant(req, req.params.id)

  if (!resolved) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { participant, deal, groupBuyingService } = resolved
  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
  const existingDisputes = Array.isArray(metadata.participant_disputes)
    ? metadata.participant_disputes
    : []

  const dispute = {
    participant_id: String(participant.id),
    customer_id: String(participant.customer_id ?? ""),
    reason: body.reason,
    details: body.details ?? null,
    status: "open",
    created_at: new Date().toISOString(),
  }

  await groupBuyingService.updateGroupDeals({
    id: String(deal.id),
    metadata: {
      ...metadata,
      participant_disputes: [...existingDisputes, dispute],
    },
  })

  res.status(201).json({ dispute })
}
