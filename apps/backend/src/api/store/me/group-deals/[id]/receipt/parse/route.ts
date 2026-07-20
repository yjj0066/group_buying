import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { processGroupDealReceiptParse } from "../../../../../../../utils/group-deal-document-ai"
import {
  PostStoreMeGroupDealDocumentParse,
  PostStoreMeGroupDealDocumentParseType,
} from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMeGroupDealDocumentParseType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostStoreMeGroupDealDocumentParse.parse(req.body ?? {})

  const result = await processGroupDealReceiptParse(req.scope, {
    groupDealId: req.params.id,
    customerId,
    imageBase64: body.image_base64,
    filename: body.filename,
  })

  res.status(200).json(result)
}
