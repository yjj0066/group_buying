import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { processGroupDealShippingComplete } from "../../../../../../../utils/group-deal-leader-ops"
import { respondWithRouteError } from "../../../../../../../utils/route-error"
import {
  PostStoreMeGroupDealShippingComplete,
  PostStoreMeGroupDealShippingCompleteType,
} from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMeGroupDealShippingCompleteType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreMeGroupDealShippingComplete.parse(req.body ?? {})

    const result = await processGroupDealShippingComplete(req.scope, {
      groupDealId: req.params.id,
      customerId,
      entries: body.entries,
    })

    res.status(200).json({
      updated_count: result.updated_count,
      notified_count: result.notified_count,
      updated_participant_ids: result.updated_participant_ids,
    })
  } catch (error) {
    respondWithRouteError(res, error, {
      logLabel: "shipping/complete",
      fallbackMessage: "발송 확정 처리에 실패했습니다.",
    })
  }
}
