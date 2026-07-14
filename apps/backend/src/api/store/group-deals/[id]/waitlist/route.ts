import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { enqueueWaitlistWorkflow } from "../../../../../workflows/group-deal-escrow"
import {
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../../../utils/group-deal-store"
import { PostStoreJoinGroupDealWaitlist } from "../../validators"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = PostStoreJoinGroupDealWaitlist.parse(req.body)
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const id = req.params.id

  let deal

  try {
    deal = await groupBuyingService.retrieveGroupDeal(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal with id ${id} was not found`
    )
  }

  if (!isStoreVisibleGroupDealStatus(String(deal.status))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This group deal is not accepting waitlist entries"
    )
  }

  const customerId =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ??
    null

  const { result } = await enqueueWaitlistWorkflow(req.scope).run({
    input: {
      group_deal_id: id,
      email: body.email,
      customer_id: customerId,
      quantity: body.quantity,
      selections: body.selections,
      priority: body.priority,
    },
  })

  const options = await groupBuyingService.listDealOptions(id)

  res.status(201).json({
    waitlist_entry: result,
    group_deal: serializeStoreGroupDeal(
      deal as unknown as Record<string, unknown>,
      options as unknown as Record<string, unknown>[]
    ),
  })
}
