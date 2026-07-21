import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ZodError } from "zod"

import { processGroupDealReceiptParse } from "../../../../../../../utils/group-deal-document-ai"
import {
  PostStoreMeGroupDealDocumentParse,
  PostStoreMeGroupDealDocumentParseType,
} from "../../../validators"

const resolveRouteErrorStatus = (error: unknown): number => {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    typeof (error as MedusaError).type === "string"
  ) {
    switch ((error as MedusaError).type) {
      case MedusaError.Types.NOT_ALLOWED:
      case MedusaError.Types.INVALID_DATA:
        return 400
      case MedusaError.Types.NOT_FOUND:
        return 404
      case MedusaError.Types.UNAUTHORIZED:
        return 401
      default:
        return 500
    }
  }

  return 500
}

const respondWithRouteError = (res: MedusaResponse, error: unknown) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: error.issues.map((issue) => issue.message).join("\n"),
      type: MedusaError.Types.INVALID_DATA,
    })
    return
  }

  if (error instanceof MedusaError) {
    res.status(resolveRouteErrorStatus(error)).json({
      message: error.message,
      type: error.type,
    })
    return
  }

  console.error("[receipt/parse]", error)

  res.status(500).json({
    message:
      error instanceof Error
        ? error.message
        : "Receipt parse failed on the server",
    type: "unexpected_error",
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMeGroupDealDocumentParseType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreMeGroupDealDocumentParse.parse(req.body ?? {})

    const result = await processGroupDealReceiptParse(req.scope, {
      groupDealId: req.params.id,
      customerId,
      imageBase64: body.image_base64,
      filename: body.filename,
    })

    res.status(200).json(result)
  } catch (error) {
    respondWithRouteError(res, error)
  }
}
