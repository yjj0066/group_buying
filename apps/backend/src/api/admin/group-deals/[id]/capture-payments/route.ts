import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { captureGroupDealPaymentsWorkflow } from "../../../../../workflows/group-deal-billing"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await captureGroupDealPaymentsWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
    },
  })

  res.status(200).json({
    group_deal: result.group_deal,
    capture_result: result.capture_result,
  })
}
