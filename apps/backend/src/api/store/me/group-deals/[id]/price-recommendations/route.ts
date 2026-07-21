import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { buildOptionPriceRecommendations } from "../../../../../../utils/group-deal-price-recommendations"
import type { OptionRecord } from "../../../../../../utils/group-deal-price-recommendations"

const resolveHostedDeal = async (
  req: AuthenticatedMedusaRequest,
  dealId: string
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return null
  }

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deal = await groupBuyingService.retrieveGroupDeal(dealId)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    return null
  }

  return { deal, groupBuyingService }
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const resolved = await resolveHostedDeal(req, req.params.id)

  if (!resolved) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { deal, groupBuyingService } = resolved
  const options = await groupBuyingService.listDealOptions(String(deal.id))

  const recommendations = buildOptionPriceRecommendations({
    options: options as OptionRecord[],
    dealPrice: Number(deal.deal_price ?? 0),
  }).filter((item) => item.recommended_price < item.current_price)

  res.json({
    group_deal_id: String(deal.id),
    disclaimer:
      "추천 가격은 참고용입니다. 모집 중 가격 인상은 불가하며, 인하만 적용할 수 있습니다.",
    recommendations,
  })
}
