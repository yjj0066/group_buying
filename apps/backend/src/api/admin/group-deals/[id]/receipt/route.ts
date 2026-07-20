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
  extractDocumentStub,
  validatePurchaseReceiptStub,
} from "../../../../../utils/document-extract-stub"
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
  const metadata = (existing.metadata as Record<string, unknown> | null) ?? {}
  let receiptUrl = body.image_url ?? existing.purchase_receipt_url
  let structuredReceipt =
    (metadata.purchase_receipt_structured as Record<string, unknown> | null) ??
    null

  if (body.image_base64) {
    receiptUrl = saveGroupDealReceiptImage({
      groupDealId: req.params.id,
      imageBase64: body.image_base64,
      filename: body.filename,
    })

    const extracted = extractDocumentStub({
      kind: "purchase_receipt",
      image_url: receiptUrl,
      declared_album_quantity:
        metadata.declared_album_quantity != null
          ? Number(metadata.declared_album_quantity)
          : Number(existing.target_quantity ?? 0),
      primary_seller:
        metadata.primary_seller != null
          ? String(metadata.primary_seller)
          : null,
    })

    structuredReceipt = extracted.receipt_fields ?? null
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

  if (body.note != null || structuredReceipt) {
    await groupBuyingService.updateGroupDeals({
      id: req.params.id,
      metadata: {
        ...(existing.metadata ?? {}),
        ...(body.note != null ? { purchase_receipt_note: body.note } : {}),
        ...(structuredReceipt
          ? { purchase_receipt_structured: structuredReceipt }
          : {}),
      },
    })
  }

  if (
    structuredReceipt &&
    body.status !== GroupDealReceiptStatus.REJECTED &&
    !body.status
  ) {
    const validation = validatePurchaseReceiptStub({
      structured: structuredReceipt as Parameters<
        typeof validatePurchaseReceiptStub
      >[0]["structured"],
      declared_album_quantity:
        metadata.declared_album_quantity != null
          ? Number(metadata.declared_album_quantity)
          : Number(existing.target_quantity ?? 0),
      primary_seller:
        metadata.primary_seller != null
          ? String(metadata.primary_seller)
          : null,
      all_participants_paid_at: null,
    })

    if (validation.passed) {
      await groupBuyingService.updatePurchaseReceipt({
        group_deal_id: req.params.id,
        receipt_url: receiptUrl,
        status: GroupDealReceiptStatus.VERIFIED,
      })
    }
  }

  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}
