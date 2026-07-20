import {
  GROUP_BUYING_LEADER_DEPOSIT_AMOUNT,
  GROUP_BUYING_PLATFORM_FEE,
  GROUP_BUYING_SHIPPING_FEE,
} from "@lib/constants/group-buying-fees"
import { loadLeaderCreateDraft } from "@modules/group-buying/components/leader-create-wizard/storage"
import { loadLeaderPurchaseProofDraft } from "@modules/group-buying/components/leader-purchase-proof/storage"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import { computeLeaderFinalizeData } from "./leader-order-finalize"

export type LeaderSettlementBankAccount = {
  bankCode: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

export type LeaderSettlementBreakdown = {
  participantCount: number
  participantTotal: number
  purchaseCost: number
  shippingFees: number
  platformFees: number
  totalFees: number
  depositRefund: number
  finalPayout: number
}

export const maskSettlementAccountNumber = (accountNumber: string): string => {
  const trimmed = accountNumber.trim()

  if (trimmed.length <= 4) {
    return trimmed
  }

  const visibleEnd = trimmed.slice(-4)
  return `***${visibleEnd}`
}

export const resolveShippingFeePerParticipant = (): number => {
  const draft = loadLeaderCreateDraft()
  const parsedFees = draft.shippingMethods
    .map((method) => Number(String(method.fee).replace(/,/g, "")))
    .filter((fee) => Number.isFinite(fee) && fee > 0)

  if (parsedFees.length) {
    return parsedFees[0]
  }

  return GROUP_BUYING_SHIPPING_FEE
}

export const resolveLeaderSettlementPurchaseCost = (
  dealId: string,
  deal: GroupDeal,
  participantCount: number
): number => {
  const targetQuantity =
    deal.target_quantity || deal.min_participants || participantCount || 1
  const purchaseProof = loadLeaderPurchaseProofDraft(dealId, targetQuantity)

  if (
    purchaseProof.totalPaidAmount != null &&
    purchaseProof.totalPaidAmount > 0
  ) {
    return purchaseProof.totalPaidAmount
  }

  const unitPrice = deal.deal_price || 0
  return unitPrice * Math.max(participantCount, 1)
}

export const computeLeaderSettlementBreakdown = (
  deal: GroupDeal,
  participations: LeaderDealParticipation[]
): LeaderSettlementBreakdown => {
  const { summary } = computeLeaderFinalizeData(deal, participations)
  const participantCount = Math.max(summary.participantCount, 0)
  const shippingFeePerParticipant = resolveShippingFeePerParticipant()
  const shippingFees = participantCount * shippingFeePerParticipant
  const platformFees = participantCount * GROUP_BUYING_PLATFORM_FEE
  const totalFees = shippingFees + platformFees
  const purchaseCost = resolveLeaderSettlementPurchaseCost(
    deal.id,
    deal,
    participantCount
  )
  const depositRefund = GROUP_BUYING_LEADER_DEPOSIT_AMOUNT
  const finalPayout =
    summary.totalDepositedAmount - purchaseCost - totalFees + depositRefund

  return {
    participantCount,
    participantTotal: summary.totalDepositedAmount,
    purchaseCost,
    shippingFees,
    platformFees,
    totalFees,
    depositRefund,
    finalPayout,
  }
}

export const readRefundBankAccountFromDealMetadata = (
  metadata: Record<string, unknown> | null | undefined
): LeaderSettlementBankAccount | null => {
  const raw = metadata?.refund_bank_account

  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const bankName = typeof record.bank_name === "string" ? record.bank_name : ""
  const bankCode = typeof record.bank_code === "string" ? record.bank_code : ""
  const accountHolder =
    typeof record.account_holder === "string" ? record.account_holder : ""
  const accountNumber =
    typeof record.account_number === "string"
      ? record.account_number
      : typeof record.account_number_masked === "string"
        ? record.account_number_masked
        : ""

  if (!bankName || !accountNumber || !accountHolder) {
    return null
  }

  return {
    bankCode,
    bankName,
    accountNumber,
    accountHolder,
  }
}

export const resolveLeaderSettlementBankAccount = (
  dealId: string,
  dealMetadata?: Record<string, unknown> | null,
  settlementOverride?: LeaderSettlementBankAccount | null
): LeaderSettlementBankAccount | null => {
  if (
    settlementOverride?.bankName &&
    settlementOverride.accountNumber &&
    settlementOverride.accountHolder
  ) {
    return settlementOverride
  }

  const wizardDraft = loadLeaderCreateDraft()
  const wizardAccount = wizardDraft.refundAccount

  if (
    wizardAccount.bankName &&
    wizardAccount.accountNumber &&
    wizardAccount.accountHolder
  ) {
    return wizardAccount
  }

  return readRefundBankAccountFromDealMetadata(dealMetadata)
}
