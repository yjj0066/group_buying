import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { processGroupDealReceiptConfirm } from "../../../../../../../utils/group-deal-document-ai"
import { respondWithRouteError } from "../../../../../../../utils/route-error"
import {
  PostStoreMeGroupDealReceiptConfirm,
  PostStoreMeGroupDealReceiptConfirmType,
} from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMeGroupDealReceiptConfirmType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreMeGroupDealReceiptConfirm.parse(req.body ?? {})

    const result = await processGroupDealReceiptConfirm(req.scope, {
      groupDealId: req.params.id,
      customerId,
      order_number: body.order_number,
      seller: body.seller,
      ordered_at: body.ordered_at,
      album_quantity: body.album_quantity,
      total_amount: body.total_amount,
    })

    res.status(200).json(result)
  } catch (error) {
    respondWithRouteError(res, error, {
      logLabel: "receipt/confirm",
      fallbackMessage: "영수증 정보 저장에 실패했습니다.",
    })
  }
}
