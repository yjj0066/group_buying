import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cancelGroupDealWorkflow } from "../../../../../workflows/group-deals"
import { queryGroupDeal } from "../../../../../utils/query-group-deals"
import {
  PostAdminCancelGroupDeal,
  PostAdminCancelGroupDealType,
} from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminCancelGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostAdminCancelGroupDeal.parse(req.body ?? {})

  const { result } = await cancelGroupDealWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      reason: body.reason ?? null,
    },
  })

  const groupDeal = await queryGroupDeal(req.scope, result.group_deal.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}
