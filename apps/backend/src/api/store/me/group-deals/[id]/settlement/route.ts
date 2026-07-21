import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { GroupDealReportStage } from "../../../../../../types/group-buying"
import { serializeAccountGroupDeal } from "../../../../../../utils/group-deal-account"
import { emitGroupDealUpdated } from "../../../../../../workflows/group-deal-billing"
import { PostStoreMeGroupDealSettlement } from "../../validators"

const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) {
    return accountNumber
  }

  const visibleStart = accountNumber.slice(0, 2)
  const visibleEnd = accountNumber.slice(-4)
  const maskedMiddle = "*".repeat(Math.max(0, accountNumber.length - 6))

  return `${visibleStart}${maskedMiddle}${visibleEnd}`
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostStoreMeGroupDealSettlement.parse(req.body ?? {})
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  if (String(deal.leader_customer_id ?? "") !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only the deal leader can submit settlement for this group deal"
    )
  }

  const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

  if (!metadata.shipping_completed_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Shipping must be completed before submitting settlement"
    )
  }

  if (metadata.settlement_submitted_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Settlement has already been submitted for this group deal"
    )
  }

  const submittedAt = new Date().toISOString()

  await groupBuyingService.updateGroupDeals({
    id: req.params.id,
    report_stage: GroupDealReportStage.SETTLEMENT_READY,
    metadata: {
      ...metadata,
      settlement_submitted_at: submittedAt,
      settlement_bank_account: {
        bank_code: body.bank_code.trim(),
        bank_name: body.bank_name.trim(),
        account_number_masked: maskAccountNumber(body.account_number.trim()),
        account_holder: body.account_holder.trim(),
        submitted_at: submittedAt,
      },
    },
  })

  await emitGroupDealUpdated(req.scope, req.params.id)

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  res.status(200).json({
    group_deal: serializeAccountGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    submitted_at: submittedAt,
  })
}
