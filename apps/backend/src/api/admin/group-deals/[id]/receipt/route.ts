import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { GroupDealReceiptStatus } from "../../../../../types/group-buying"
import { queryGroupDeal } from "../../../../../utils/query-group-deals"
import { saveGroupDealReceiptImage } from "../../../../../utils/group-deal-leader-ops"
import {
  PostAdminGroupDealReceipt,
  PostAdminGroupDealReceiptType,
} from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminGroupDealReceiptType>,
  res: MedusaResponse
) => {
  const body = PostAdminGroupDealReceipt.parse(req.body ?? {})
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const existing = await groupBuyingService.retrieveGroupDeal(req.params.id)
  let receiptUrl = body.image_url ?? existing.purchase_receipt_url

  if (body.image_base64) {
    receiptUrl = saveGroupDealReceiptImage({
      groupDealId: req.params.id,
      imageBase64: body.image_base64,
      filename: body.filename,
    })
  }

  const nextStatus =
    body.status ??
    (receiptUrl && receiptUrl !== existing.purchase_receipt_url
      ? GroupDealReceiptStatus.UPLOADED
      : (existing.purchase_receipt_status as GroupDealReceiptStatus))

  await groupBuyingService.updatePurchaseReceipt({
    group_deal_id: req.params.id,
    receipt_url: receiptUrl,
    status: nextStatus,
  })

  if (body.note != null) {
    await groupBuyingService.updateGroupDeals({
      id: req.params.id,
      metadata: {
        ...(existing.metadata ?? {}),
        purchase_receipt_note: body.note,
      },
    })
  }

  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}
