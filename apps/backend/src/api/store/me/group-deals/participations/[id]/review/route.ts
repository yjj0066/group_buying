import { z } from "zod"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"

const PostParticipationReview = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
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
  const body = PostParticipationReview.parse(req.body ?? {})
  const resolved = await resolveParticipant(req, req.params.id)

  if (!resolved) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { participant, deal, groupBuyingService } = resolved

  if (!participant.delivery_confirmed_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Reviews are available after delivery confirmation"
    )
  }

  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
  const existingReviews = Array.isArray(metadata.leader_reviews)
    ? metadata.leader_reviews
    : []

  const review = {
    id: `review_${participantId}_${Date.now()}`,
    participant_id: String(participant.id),
    customer_id: String(participant.customer_id ?? ""),
    rating: body.rating,
    comment: body.comment ?? null,
    created_at: new Date().toISOString(),
  }

  await groupBuyingService.updateGroupDeals({
    id: String(deal.id),
    metadata: {
      ...metadata,
      leader_reviews: [...existingReviews, review],
    },
  })

  res.status(201).json({ review })
}
