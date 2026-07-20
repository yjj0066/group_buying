import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getGroupDealDocumentAiJob } from "../../../../../../../../utils/group-deal-document-ai"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const job = await getGroupDealDocumentAiJob(req.scope, {
    groupDealId: req.params.id,
    customerId,
    jobId: req.params.jobId,
  })

  res.status(200).json({ job })
}
