import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { prepareGroupDealCheckoutWorkflow } from "../../../../../workflows/group-deals"
import { resolveRegionIdByCountryCode } from "../../../../../utils/resolve-region"
import {
  PostStoreJoinGroupDeal,
  PostStoreJoinGroupDealType,
} from "../../validators"

export const POST = async (
  req: MedusaRequest<PostStoreJoinGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostStoreJoinGroupDeal.parse(req.body)
  const regionId = await resolveRegionIdByCountryCode(
    req.scope,
    body.country_code
  )

  const customerId =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ??
    null

  const { result } = await prepareGroupDealCheckoutWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      email: body.email,
      quantity: body.quantity,
      region_id: regionId,
      customer_id: customerId,
      cart_id: body.cart_id ?? null,
    },
  })

  res.status(201).json({
    cart_id: result.cart_id,
    participant: result.participant,
    group_deal: result.group_deal,
    checkout_path: "/checkout",
  })
}
