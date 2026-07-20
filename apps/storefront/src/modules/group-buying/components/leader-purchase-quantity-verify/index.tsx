"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { computeLeaderAutoAllocation } from "@lib/util/leader-quantity-allocation"
import { convertToLocale } from "@lib/util/money"
import { RadioGroup } from "@modules/common/components/ui"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import { computeLeaderTargetOrderQuantity } from "../leader-purchase-proof/compute-target-quantity"
import {
  saveLeaderDistributionDraft,
  type LeaderDistributionMethod,
} from "../leader-purchase-proof/distribution-storage"
import { loadLeaderPurchaseProofDraft } from "../leader-purchase-proof/storage"

type LeaderPurchaseQuantityVerifyProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const parseQuantityParam = (value: string | null): number | null => {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

const LeaderPurchaseQuantityVerify = ({
  deal,
  participations,
}: LeaderPurchaseQuantityVerifyProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchaseVerify
  const router = useRouter()
  const searchParams = useSearchParams()
  const { countryCode } = useParams() as { countryCode: string }

  const fallbackTargetQty = useMemo(
    () => computeLeaderTargetOrderQuantity(deal),
    [deal]
  )

  const draft = useMemo(
    () => loadLeaderPurchaseProofDraft(deal.id, fallbackTargetQty),
    [deal.id, fallbackTargetQty]
  )

  const purchasedQty =
    parseQuantityParam(searchParams.get("purchasedQty")) ??
    draft.purchasedQuantity
  const targetQty =
    parseQuantityParam(searchParams.get("targetQty")) ??
    draft.targetQuantity ??
    fallbackTargetQty

  const shortage =
    purchasedQty != null && targetQty != null
      ? Math.max(0, targetQty - purchasedQty)
      : null

  const isMatch = shortage === 0
  const isShortage = shortage != null && shortage > 0

  const [distributionMethod, setDistributionMethod] =
    useState<LeaderDistributionMethod>("auto")
  const [autoAllocation, setAutoAllocation] = useState(
    () =>
      purchasedQty != null
        ? computeLeaderAutoAllocation(participations, purchasedQty)
        : null
  )
  const [showAutoSummary, setShowAutoSummary] = useState(false)

  const handleProceedToShipping = () => {
    router.push(gbAppRoutes.sellerShipping(countryCode, deal.id))
  }

  const handleShortageNext = () => {
    if (purchasedQty == null || targetQty == null || shortage == null) {
      return
    }

    if (distributionMethod === "manual") {
      saveLeaderDistributionDraft(deal.id, {
        method: "manual",
        shortage,
        purchasedQuantity: purchasedQty,
        targetQuantity: targetQty,
        savedAt: new Date().toISOString(),
      })

      router.push(gbAppRoutes.sellerManualDistribution(countryCode, deal.id))
      return
    }

    const allocation = computeLeaderAutoAllocation(participations, purchasedQty)

    saveLeaderDistributionDraft(deal.id, {
      method: "auto",
      shortage,
      purchasedQuantity: purchasedQty,
      targetQuantity: targetQty,
      autoAllocation: allocation,
      savedAt: new Date().toISOString(),
    })

    setAutoAllocation(allocation)
    setShowAutoSummary(true)
  }

  const autoSummaryRows =
    autoAllocation?.refunded.map((row) => [
      row.recipientName,
      row.memberLabel,
      String(row.refundQuantity),
      convertToLocale({
        amount: row.refundAmount,
        currency_code: deal.currency_code,
      }),
    ]) ?? []

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbSectionHeader
        title={labels.title}
        subtitle={`${labels.stepLabel} · ${deal.title}`}
      />

      <BbKeyValue
        items={[
          {
            label: labels.targetQuantityLabel,
            value: labels.quantityUnit.replace("{count}", String(targetQty ?? "-")),
          },
          {
            label: labels.purchasedQuantityLabel,
            value:
              purchasedQty != null
                ? labels.quantityUnit.replace("{count}", String(purchasedQty))
                : "-",
          },
        ]}
      />

      {purchasedQty == null || targetQty == null ? (
        <BbAlert variant="warning">{labels.missingDataMessage}</BbAlert>
      ) : isMatch ? (
        <>
          <BbAlert variant="success">{labels.matchMessage}</BbAlert>
          <BbButton
            variant="cta"
            fullWidth
            onClick={handleProceedToShipping}
            data-testid="leader-quantity-verify-proceed-shipping"
          >
            {labels.proceedShippingButton}
          </BbButton>
        </>
      ) : isShortage ? (
        <>
          <BbAlert variant="error">
            {labels.shortageMessage.replace("{count}", String(shortage))}
          </BbAlert>

          {!showAutoSummary ? (
            <>
              <BbSectionHeader
                title={labels.distributionTitle}
                className="mb-0"
              />

              <RadioGroup className="gap-3">
                <label
                  htmlFor="distribution-auto"
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                    distributionMethod === "auto"
                      ? "border-brand-purple bg-violet-50"
                      : "border-[var(--bb-line)]"
                  }`}
                >
                  <RadioGroup.Item
                    name="distribution-method"
                    value="auto"
                    id="distribution-auto"
                    checked={distributionMethod === "auto"}
                    onChange={() => setDistributionMethod("auto")}
                  />
                  <span className="text-sm leading-relaxed text-[var(--bb-ink)]">
                    {labels.distributionAutoLabel}
                  </span>
                </label>
                <label
                  htmlFor="distribution-manual"
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                    distributionMethod === "manual"
                      ? "border-brand-purple bg-violet-50"
                      : "border-[var(--bb-line)]"
                  }`}
                >
                  <RadioGroup.Item
                    name="distribution-method"
                    value="manual"
                    id="distribution-manual"
                    checked={distributionMethod === "manual"}
                    onChange={() => setDistributionMethod("manual")}
                  />
                  <span className="text-sm leading-relaxed text-[var(--bb-ink)]">
                    {labels.distributionManualLabel}
                  </span>
                </label>
              </RadioGroup>

              <BbButton
                variant="cta"
                fullWidth
                onClick={handleShortageNext}
                data-testid="leader-quantity-verify-shortage-next"
              >
                {labels.nextButton}
              </BbButton>
            </>
          ) : (
            <>
              <BbAlert variant="info">{labels.autoAllocationSummaryTitle}</BbAlert>

              {autoSummaryRows.length > 0 ? (
                <BbTable
                  columns={[
                    labels.autoRefundNameColumn,
                    labels.autoRefundMemberColumn,
                    labels.autoRefundQuantityColumn,
                    labels.autoRefundAmountColumn,
                  ]}
                  rows={autoSummaryRows}
                />
              ) : (
                <BbAlert variant="info">{labels.autoAllocationEmpty}</BbAlert>
              )}

              <BbButton
                variant="cta"
                fullWidth
                onClick={handleProceedToShipping}
                data-testid="leader-quantity-verify-auto-proceed-shipping"
              >
                {labels.proceedShippingButton}
              </BbButton>
            </>
          )}
        </>
      ) : (
        <>
          <BbAlert variant="info">
            {labels.surplusMessage.replace(
              "{count}",
              String(Math.max(0, (purchasedQty ?? 0) - (targetQty ?? 0)))
            )}
          </BbAlert>
          <BbButton variant="cta" fullWidth onClick={handleProceedToShipping}>
            {labels.proceedShippingButton}
          </BbButton>
        </>
      )}
    </div>
  )
}

export default LeaderPurchaseQuantityVerify
