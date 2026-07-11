import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { joinDemandSurveyWorkflow } from "../../../../../../workflows/demand-survey"
import {
  PostStoreDemandSurveyParticipate,
  PostStoreDemandSurveyParticipateType,
} from "./validators"

export const POST = async (
  req: MedusaRequest<PostStoreDemandSurveyParticipateType>,
  res: MedusaResponse
) => {
  const body = PostStoreDemandSurveyParticipate.parse(req.body)

  const { result } = await joinDemandSurveyWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      participant_id: body.participant_id,
      email: body.email,
    },
  })

  res.status(201).json(result)
}
