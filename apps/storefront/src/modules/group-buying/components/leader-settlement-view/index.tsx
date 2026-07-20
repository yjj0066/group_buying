"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { submitLeaderSettlementRequest } from "@lib/data/leader-settlement"
import { applyLeaderDealRuntimeOverrides } from "@lib/util/apply-leader-deal-runtime"
import {
  computeLeaderSettlementBreakdown,
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
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import LeaderSettlementBankAccountEditModal from "../leader-settlement/bank-account-edit-modal"
import LeaderSettlementSuccessDialog from "../leader-settlement/settlement-success-dialog"
import {
  loadLeaderSettlementDraft,
  markLeaderSettlementSubmitted,
  saveLeaderSettlementBankAccount,
} from "../leader-settlement/storage"

type LeaderSettlementViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const LeaderSettlementView = ({
  deal,
  participations,
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
  const [bankModalOpen, setBankModalOpen] = useState(false)
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
      dealWithRuntime.metadata?.settlement_submitted_at ||
      dealWithRuntime.status === "completed"
  )

  useEffect(() => {
    const draft = loadLeaderSettlementDraft(deal.id)
    setSettlementDraft(draft)

    const resolved = resolveLeaderSettlementBankAccount(
      deal.id,
      deal.metadata,
      draft.bankAccount
    )

    setBankAccount(resolved)
  }, [deal.id, deal.metadata])

  const formatAmount = (amount: number, prefix = "") =>
    `${prefix}${convertToLocale({
      amount,
      currency_code: deal.currency_code,
    })}`

  const handleSaveBankAccount = (account: LeaderSettlementBankAccount) => {
    saveLeaderSettlementBankAccount(deal.id, account)
    setBankAccount(account)
    setSettlementDraft(loadLeaderSettlementDraft(deal.id))
  }

  const handleSubmit = async () => {
    if (!bankAccount) {
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
            title="입금 계좌"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          {bankAccount ? (
            <Text className="text-sm text-[#111827]">
              {bankAccount.bankName}{" "}
              {maskSettlementAccountNumber(bankAccount.accountNumber)} (
              {bankAccount.accountHolder})
            </Text>
          ) : (
            <BbAlert variant="warning">{labels.bankRequiredError}</BbAlert>
          )}
          {bankAccount && !isAlreadySubmitted ? (
            <BbButton
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => setBankModalOpen(true)}
            >
              {labels.editBankAccount}
            </BbButton>
          ) : null}
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
            disabled={!bankAccount || breakdown.participantCount === 0}
            onClick={handleSubmit}
            data-testid="leader-settlement-submit"
          >
            {isSubmitting ? labels.submitting : "정산 받기"}
          </BbButton>
        ) : null}

        <LocalizedClientLink href={gbAppRoutes.sellerDeal(countryCode, deal.id)}>
          <BbButton variant="secondary">
            {labels.backToDashboard}
          </BbButton>
        </LocalizedClientLink>
      </div>

      {bankAccount ? (
        <LeaderSettlementBankAccountEditModal
          open={bankModalOpen}
          initialAccount={bankAccount}
          onClose={() => setBankModalOpen(false)}
          onSave={handleSaveBankAccount}
        />
      ) : null}

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
