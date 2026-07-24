import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { respondWithRouteError } from "../../../../../../utils/route-error"
import { serializeAccountGroupDeal } from "../../../../../../utils/group-deal-account"
import { recordLeaderDepositWorkflow } from "../../../../../../workflows/group-deal-escrow"
import { PostStoreMeLeaderDeposit } from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreMeLeaderDeposit.parse(req.body ?? {})
    const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
      GROUP_BUYING_MODULE
    )
    const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

    if (String(deal.leader_customer_id ?? "") !== customerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only the deal leader can record leader deposit"
      )
    }

    const depositAmount =
      body.deposit_amount ?? Number(deal.deposit_amount ?? 0)

    await recordLeaderDepositWorkflow(req.scope).run({
      input: {
        group_deal_id: req.params.id,
        leader_customer_id: customerId,
        deposit_amount: depositAmount,
        deposit_payment_key: body.deposit_payment_key,
      },
    })

    const updatedDeal = await groupBuyingService.retrieveGroupDeal(req.params.id)

    res.status(200).json({
      group_deal: serializeAccountGroupDeal(
        updatedDeal as unknown as Record<string, unknown>
      ),
      deposit_recorded: true,
    })
  } catch (error) {
    respondWithRouteError(res, error, {
      logLabel: "store/me/group-deals/[id]/deposit POST",
      fallbackMessage: "Leader deposit could not be recorded on the server",
    })
  }
}
