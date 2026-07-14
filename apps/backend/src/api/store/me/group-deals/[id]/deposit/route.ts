import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { serializeAccountGroupDeal } from "../../../../../../utils/group-deal-account"
import { recordLeaderDepositWorkflow } from "../../../../../../workflows/group-deal-escrow"
import {
  PostStoreMeLeaderDeposit,
  PostStoreMeLeaderDepositType,
} from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMeLeaderDepositType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostStoreMeLeaderDeposit.parse(req.body)
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  if (deal.leader_customer_id && deal.leader_customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the assigned leader can pay the deposit for this group deal"
    )
  }

  const { result } = await recordLeaderDepositWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      leader_customer_id: customerId,
      deposit_amount: body.deposit_amount,
      deposit_payment_key: body.deposit_payment_key,
    },
  })

  res.json({
    group_deal: serializeAccountGroupDeal(
      result as unknown as Record<string, unknown>
    ),
  })
}
