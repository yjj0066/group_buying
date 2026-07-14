import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { assertPurchaseReceiptVerified } from "../../../../../utils/group-deal-leader-ops"
import { queryGroupDeal } from "../../../../../utils/query-group-deals"
import {
  PostAdminGroupDealTracking,
  PostAdminGroupDealTrackingType,
} from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminGroupDealTrackingType>,
  res: MedusaResponse
) => {
  const body = PostAdminGroupDealTracking.parse(req.body ?? {})
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  await assertPurchaseReceiptVerified(req.scope, req.params.id)

  const updatedParticipantIds =
    await groupBuyingService.bulkUpdateParticipantTracking({
      group_deal_id: req.params.id,
      entries: body.entries,
    })

  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({
    group_deal: groupDeal,
    updated_participant_ids: updatedParticipantIds,
  })
}
