import type { LeaderCreateDraft } from "./types"

export const isLeaderCreateShippingStepValid = (draft: LeaderCreateDraft) => {
  const hasDepositPeriod =
    Boolean(draft.depositPeriodStartDate.trim()) &&
    Boolean(draft.depositPeriodStartTime.trim()) &&
    Boolean(draft.depositPeriodEndDate.trim()) &&
    Boolean(draft.depositPeriodEndTime.trim())

  const hasValidShippingMethods = draft.shippingMethods.some(
    (method) =>
      method.name.trim().length > 0 &&
      method.fee.trim().length > 0 &&
      !Number.isNaN(Number(method.fee)) &&
      Number(method.fee) >= 0
  )

  const refund = draft.refundAccount

  const hasRefundAccount =
    Boolean(refund.bankCode.trim()) &&
    Boolean(refund.accountNumber.trim()) &&
    Boolean(refund.accountHolder.trim())

  return hasDepositPeriod && hasValidShippingMethods && hasRefundAccount
}
