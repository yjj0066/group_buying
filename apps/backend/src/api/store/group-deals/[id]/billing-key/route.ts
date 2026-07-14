import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { registerGroupDealBillingKeyWorkflow } from "../../../../../workflows/group-deal-billing"
import {
  PostStoreRegisterGroupDealBillingKey,
  PostStoreRegisterGroupDealBillingKeyType,
} from "../../validators"

export const POST = async (
  req: MedusaRequest<PostStoreRegisterGroupDealBillingKeyType>,
  res: MedusaResponse
) => {
  const body = PostStoreRegisterGroupDealBillingKey.parse(req.body)

  const { result } = await registerGroupDealBillingKeyWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      participant_id: body.participant_id,
      billing_key: body.billing_key,
      billing_customer_key: body.billing_customer_key,
      payment_session_id: body.payment_session_id ?? null,
    },
  })

  res.status(200).json({
    participant: result.participant,
    group_deal: result.group_deal,
    capture_result: result.capture_result,
  })
}
