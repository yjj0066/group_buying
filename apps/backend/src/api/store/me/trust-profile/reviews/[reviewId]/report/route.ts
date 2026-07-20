import { z } from "zod"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../../modules/group-buying/service"

const PostReportReview = z.object({
  reason: z.string().max(1000).optional(),
})

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostReportReview.parse(req.body ?? {})
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const hostedDeals = await groupBuyingService.listGroupDeals({
    leader_customer_id: customerId,
  })

  let updatedReview: Record<string, unknown> | null = null

  for (const deal of hostedDeals) {
    const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
    const reviews = Array.isArray(metadata.leader_reviews)
      ? [...metadata.leader_reviews]
      : []

    const index = reviews.findIndex((item) => {
      if (!item || typeof item !== "object") {
        return false
      }

      const record = item as Record<string, unknown>
      const reviewId = String(
        record.id ?? `${deal.id}-${record.participant_id ?? ""}`
      )

      return reviewId === req.params.reviewId
    })

    if (index < 0) {
      continue
    }

    const current = reviews[index] as Record<string, unknown>

    updatedReview = {
      ...current,
      reported: true,
      reported_at: new Date().toISOString(),
      report_reason: body.reason ?? null,
    }

    reviews[index] = updatedReview

    await groupBuyingService.updateGroupDeals({
      id: String(deal.id),
      metadata: {
        ...metadata,
        leader_reviews: reviews,
      },
    })

    break
  }

  if (!updatedReview) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review ${req.params.reviewId} was not found`
    )
  }

  res.status(201).json({ review: updatedReview })
}
