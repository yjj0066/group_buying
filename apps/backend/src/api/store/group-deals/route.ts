import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { queryGroupDeals } from "../../../utils/query-group-deals"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupDeals = await queryGroupDeals(req.scope)

  res.json({ group_deals: groupDeals })
}
