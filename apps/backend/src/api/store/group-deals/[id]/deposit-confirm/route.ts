import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { emitGroupDealUpdated } from "../../../../../workflows/group-deal-billing"
import {
  serializeStoreGroupDeal,
  serializeStoreGroupDealParticipant,
} from "../../../../../utils/group-deal-store"
import {
  PostStoreConfirmVirtualAccountDeposit,
  PostStoreConfirmVirtualAccountDepositType,
} from "../../validators"

export const POST = async (
  req: MedusaRequest<PostStoreConfirmVirtualAccountDepositType>,
  res: MedusaResponse
) => {
  const body = PostStoreConfirmVirtualAccountDeposit.parse(req.body)
  const customerId =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ??
    null

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const existingParticipant =
    await groupBuyingService.retrieveGroupDealParticipant(body.participant_id)

  if (String(existingParticipant.customer_id ?? "") !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only confirm your own participation deposit"
    )
  }

  const participant = await groupBuyingService.confirmVirtualAccountDeposit({
    group_deal_id: req.params.id,
    participant_id: body.participant_id,
  })

  await emitGroupDealUpdated(req.scope, req.params.id)

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)
  const dealMetadata = (deal.metadata as Record<string, unknown> | null) ?? null

  res.status(200).json({
    participant: serializeStoreGroupDealParticipant(
      participant as unknown as Record<string, unknown>,
      dealMetadata
    ),
    group_deal: serializeStoreGroupDeal(
      deal as unknown as Record<string, unknown>
    ),
    deposit_confirmed: true,
  })
}
