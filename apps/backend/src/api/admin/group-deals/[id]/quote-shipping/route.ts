import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { quoteGroupDealShippingWorkflow } from "../../../../../workflows/group-deal-second-payment"
import { queryGroupDeal } from "../../../../../utils/query-group-deals"
import {
  PostAdminQuoteGroupDealShipping,
  PostAdminQuoteGroupDealShippingType,
} from "../../validators"

/**
 * 2차금(배송비) 견적 확정
 * - split_product_shipping 모드 공구에서 1인당 배송비 확정
 * - 참여자 second_payment_status → ready
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminQuoteGroupDealShippingType>,
  res: MedusaResponse
) => {
  const body = PostAdminQuoteGroupDealShipping.parse(req.body)

  const { result } = await quoteGroupDealShippingWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      estimated_shipping_fee: body.estimated_shipping_fee,
      shipping_fee_note: body.shipping_fee_note ?? null,
    },
  })

  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
    withOptions: true,
  })

  res.json({
    group_deal: groupDeal,
    quote_result: result,
  })
}
