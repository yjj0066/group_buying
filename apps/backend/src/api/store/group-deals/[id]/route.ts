import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { queryGroupDeal } from "../../../../utils/query-group-deals"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}
