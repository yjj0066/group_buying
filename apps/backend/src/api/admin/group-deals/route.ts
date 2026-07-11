import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { queryGroupDeals } from "../../../utils/query-group-deals"
import { createGroupDealWorkflow } from "../../../workflows/group-deals"
import {
  PostAdminCreateGroupDeal,
  PostAdminCreateGroupDealType,
} from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const groupDeals = await queryGroupDeals(req.scope)

  res.json({ group_deals: groupDeals })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminCreateGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostAdminCreateGroupDeal.parse(req.body)

  const { result } = await createGroupDealWorkflow(req.scope).run({
    input: body,
  })

  res.status(201).json({ group_deal: result })
}
