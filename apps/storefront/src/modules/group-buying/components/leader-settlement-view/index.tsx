"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { submitLeaderSettlementRequest } from "@lib/data/leader-settlement"
import { applyLeaderDealRuntimeOverrides } from "@lib/util/apply-leader-deal-runtime"
import {
  computeLeaderSettlementBreakdown,
  isLeaderSettlementBankAccountComplete,
  maskSettlementAccountNumber,
  resolveLeaderSettlementBankAccount,
  type LeaderSettlementBankAccount,
} from "@lib/util/leader-settlement"
import { convertToLocale } from "@lib/util/money"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import { Text } from "@modules/common/components/ui"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { markLeaderDealSettled } from "@modules/group-buying/components/leader-deal-runtime/storage"
import type { RefundBankAccount } from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import LeaderSettlementBankAccountForm from "../leader-settlement/bank-account-form"
import LeaderSettlementSuccessDialog from "../leader-settlement/settlement-success-dialog"
import {
  loadLeaderSettlementDraft,
  markLeaderSettlementSubmitted,
  saveLeaderSettlementBankAccount,
} from "../leader-settlement/storage"

type LeaderSettlementViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
  registeredBankAccount?: RefundBankAccount | null
}

const LeaderSettlementView = ({
  deal,
  participations,
  registeredBankAccount = null,
}: LeaderSettlementViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderSettlement
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [settlementDraft, setSettlementDraft] = useState(() =>
    loadLeaderSettlementDraft(deal.id)
  )
  const [bankAccount, setBankAccount] =
    useState<LeaderSettlementBankAccount | null>(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const dealWithRuntime = useMemo(
    () => applyLeaderDealRuntimeOverrides(deal),
    [deal]
  )

  const breakdown = useMemo(
    () => computeLeaderSettlementBreakdown(dealWithRuntime, participations),
    [dealWithRuntime, participations]
  )

  const isAlreadySubmitted = Boolean(
    settlementDraft.submittedAt ||
      deal.metadata?.settlement_submitted_at ||
      dealWithRuntime.metadata?.settlement_submitted_at ||
      dealWithRuntime.status === "settled"
  )

  useEffect(() => {
    const draft = loadLeaderSettlementDraft(deal.id)
    setSettlementDraft(draft)

    const resolved = resolveLeaderSettlementBankAccount(
      deal.id,
      deal.metadata,
      draft.bankAccount,
      registeredBankAccount
    )

    setBankAccount(resolved)
  }, [deal.id, deal.metadata, registeredBankAccount])

  const formatAmount = (amount: number, prefix = "") =>
    `${prefix}${convertToLocale({
      amount,
      currency_code: deal.currency_code,
    })}`

  const handleBankAccountChange = (account: LeaderSettlementBankAccount) => {
    saveLeaderSettlementBankAccount(deal.id, account)
    setBankAccount(account)
    setSettlementDraft(loadLeaderSettlementDraft(deal.id))
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!isLeaderSettlementBankAccountComplete(bankAccount)) {
      setSubmitError(labels.bankRequiredError)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const result = await submitLeaderSettlementRequest(deal.id, bankAccount)

    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    markLeaderSettlementSubmitted(deal.id)
    markLeaderDealSettled(deal.id)
    setSettlementDraft(loadLeaderSettlementDraft(deal.id))
    setSuccessDialogOpen(true)
  }

  const handleSuccessConfirm = () => {
    setSuccessDialogOpen(false)
    router.push(gbAppRoutes.myHosted(countryCode))
  }

  const submittedBankAccount =
    (deal.metadata?.settlement_bank_account as
      | {
          bank_name?: string
          account_number_masked?: string
          account_holder?: string
        }
      | undefined) ?? null

  return (
    <LeaderWireframeShell screenId="STLM" title="정산">
      <div className="flex flex-col gap-6">
        {isAlreadySubmitted ? (
          <BbAlert variant="success">{labels.alreadySubmittedMessage}</BbAlert>
        ) : null}

        <div>
          <BbSectionHeader
            title="정산 내역"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "총 모집금액",
                value: formatAmount(breakdown.participantTotal),
              },
              {
                label: "1차 구매비",
                value: formatAmount(breakdown.purchaseCost, "-"),
              },
              {
                label: "배송비 실제",
                value: formatAmount(breakdown.shippingFees, "-"),
              },
              {
                label: "플랫폼 수수료",
                value: formatAmount(breakdown.platformFees, "-"),
              },
              {
                label: "미배정 환불",
                value: formatAmount(
                  Math.max(
                    0,
                    breakdown.participantTotal -
                      breakdown.purchaseCost -
                      breakdown.shippingFees -
                      breakdown.platformFees -
                      breakdown.finalPayout +
                      breakdown.depositRefund
                  ),
                  "-"
                ),
              },
              {
                label: "최종 정산액",
                value: formatAmount(breakdown.finalPayout),
              },
            ]}
          />
        </div>

        <div>
          <BbSectionHeader
            title="보증금"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "예치액",
                value: formatAmount(breakdown.depositRefund),
              },
              { label: "상태", value: "반환 예정" },
            ]}
          />
        </div>

        <div>
          <BbSectionHeader
            title={labels.bankAccountTitle}
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          {isAlreadySubmitted && submittedBankAccount ? (
            <Text className="text-sm text-[#111827]">
              {submittedBankAccount.bank_name}{" "}
              {submittedBankAccount.account_number_masked} (
              {submittedBankAccount.account_holder})
            </Text>
          ) : isAlreadySubmitted && bankAccount ? (
            <Text className="text-sm text-[#111827]">
              {bankAccount.bankName}{" "}
              {maskSettlementAccountNumber(bankAccount.accountNumber)} (
              {bankAccount.accountHolder})
            </Text>
          ) : (
            <LeaderSettlementBankAccountForm
              value={bankAccount}
              registeredBankAccount={registeredBankAccount}
              disabled={isSubmitting}
              onChange={handleBankAccountChange}
            />
          )}
        </div>

        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
          <Text className="text-xs leading-relaxed text-[#92400E]">
            {labels.disputeWarning}
          </Text>
        </div>

        {submitError ? <BbAlert variant="error">{submitError}</BbAlert> : null}

        {!isAlreadySubmitted ? (
          <BbButton
            variant="cta"
            isLoading={isSubmitting}
            disabled={
              !isLeaderSettlementBankAccountComplete(bankAccount) ||
              breakdown.participantCount === 0
            }
            onClick={handleSubmit}
            data-testid="leader-settlement-submit"
          >
            {isSubmitting ? labels.submitting : labels.submitButton}
          </BbButton>
        ) : null}

        <LocalizedClientLink href={gbAppRoutes.sellerDeal(countryCode, deal.id)}>
          <BbButton variant="secondary">{labels.backToDashboard}</BbButton>
        </LocalizedClientLink>
      </div>

      <LeaderSettlementSuccessDialog
        open={successDialogOpen}
        onConfirm={handleSuccessConfirm}
        labels={{
          title: labels.successDialogTitle,
          message: labels.successDialogMessage,
          confirm: labels.successDialogConfirm,
        }}
      />
    </LeaderWireframeShell>
  )
}

export default LeaderSettlementView
