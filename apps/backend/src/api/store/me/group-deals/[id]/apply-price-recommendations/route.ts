import { z } from "zod"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { GroupDealStatus } from "../../../../../../types/group-buying"
import {
  assertPriceDecreaseOnly,
  buildOptionPriceRecommendations,
} from "../../../../../../utils/group-deal-price-recommendations"

const PostApplyPriceRecommendations = z.object({
  options: z
    .array(
      z.object({
        option_id: z.string().min(1),
        deal_price: z.number().positive(),
      })
    )
    .min(1),
})

const ALLOWED_STATUSES = new Set<string>([
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
])

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostApplyPriceRecommendations.parse(req.body ?? {})
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  if (!ALLOWED_STATUSES.has(String(deal.status))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Price changes are only allowed while the deal is recruiting"
    )
  }

  const options = await groupBuyingService.listDealOptions(String(deal.id))
  const optionMap = new Map(options.map((option) => [String(option.id), option]))
  const updated: Array<{ option_id: string; deal_price: number }> = []

  for (const entry of body.options) {
    const option = optionMap.get(entry.option_id)

    if (!option) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Option ${entry.option_id} was not found`
      )
    }

    const currentPrice =
      option.deal_price != null
        ? Number(option.deal_price)
        : Number(deal.deal_price)

    try {
      assertPriceDecreaseOnly({
        currentPrice,
        nextPrice: entry.deal_price,
      })
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only price decreases are allowed during recruitment"
      )
    }

    await groupBuyingService.updateGroupDealOptions({
      id: String(option.id),
      deal_price: entry.deal_price,
    })

    updated.push({
      option_id: String(option.id),
      deal_price: entry.deal_price,
    })
  }

  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
  const priceHistory = Array.isArray(metadata.price_change_history)
    ? metadata.price_change_history
    : []

  await groupBuyingService.updateGroupDeals({
    id: String(deal.id),
    metadata: {
      ...metadata,
      price_change_history: [
        ...priceHistory,
        {
          type: "decrease",
          options: updated,
          applied_at: new Date().toISOString(),
          source: "dash-05",
        },
      ],
      price_updated_at: new Date().toISOString(),
    },
  })

  const refreshedOptions = await groupBuyingService.listDealOptions(
    String(deal.id)
  )

  res.json({
    updated,
    recommendations: buildOptionPriceRecommendations({
      options: refreshedOptions as unknown as Array<Record<string, unknown>>,
      dealPrice: Number(deal.deal_price ?? 0),
    }),
  })
}
