import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { joinGroupDealWorkflow } from "../../../../../workflows/group-deals"
import {
  PostStoreJoinGroupDeal,
  PostStoreJoinGroupDealType,
} from "../../validators"

export const POST = async (
  req: MedusaRequest<PostStoreJoinGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostStoreJoinGroupDeal.parse(req.body)

  const { result } = await joinGroupDealWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      email: body.email,
      quantity: body.quantity,
      customer_id: null,
    },
  })

  res.status(201).json(result)
}
