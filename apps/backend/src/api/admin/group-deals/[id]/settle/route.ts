import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { settleGroupDealWorkflow } from "../../../../../workflows/group-deal-escrow"
import { queryGroupDeal } from "../../../../../utils/query-group-deals"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await settleGroupDealWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
    },
  })

  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({
    group_deal: groupDeal,
    settlement: result,
  })
}
