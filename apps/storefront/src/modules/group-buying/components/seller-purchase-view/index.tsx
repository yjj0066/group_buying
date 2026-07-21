"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import AiVerificationPanel from "@modules/group-buying/components/ai-verification-panel"
import { resolveDeclaredAlbumQuantity } from "@lib/util/leader-opening-shortage"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { GroupDealDocumentParseResponse } from "types/group-deal-document-ai"
import { convertToLocale } from "@lib/util/money"

type SellerPurchaseViewProps = {
  deal: GroupDeal
}

const RECEIPT_ANALYSIS_RESULTS_ID = "leader-purchase-receipt-analysis-results"

const SellerPurchaseView = ({ deal }: SellerPurchaseViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchase
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [result, setResult] = useState<GroupDealDocumentParseResponse | null>(
    null
  )
  const [hasReviewedAnalysis, setHasReviewedAnalysis] = useState(false)

  const declaredAlbumQuantity = useMemo(
    () => resolveDeclaredAlbumQuantity(deal),
    [deal]
  )

  const primarySeller =
    (deal.metadata?.primary_seller as string | undefined)?.trim() ||
    labels.primarySellerFallback

  const totalEscrow = useMemo(() => {
    if (deal.deposit_amount && deal.current_participants) {
      return deal.deal_price * deal.current_participants
    }

    return deal.deal_price * (deal.target_quantity || deal.current_participants || 0)
  }, [deal])

  const isAutoVerified =
    result?.group_deal.purchase_receipt_status === "verified" ||
    result?.document_ai.status === "parsed"

  const isFailed = result?.document_ai.status === "failed"
  const canProceed = Boolean(result && (isAutoVerified || hasReviewedAnalysis))

  useEffect(() => {
    setHasReviewedAnalysis(false)
  }, [result?.document_ai.job_id])

  const handlePrimaryAction = () => {
    if (!result) {
      return
    }

    if (isFailed) {
      router.push(gbAppRoutes.sellerPurchaseFailed(countryCode, deal.id))
      return
    }

    if (canProceed) {
      router.push(gbAppRoutes.sellerOpening(countryCode, deal.id))
      return
    }

    setHasReviewedAnalysis(true)
    document
      .getElementById(RECEIPT_ANALYSIS_RESULTS_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const buttonLabel = isFailed
    ? labels.failedButton
    : canProceed
      ? labels.proceedButton
      : labels.confirmAnalysisButton

  return (
    <LeaderWireframeShell screenId="PURC" title={labels.title}>
      <div className="flex flex-col gap-6">
        <BbKeyValue
          items={[
            {
              label: labels.declaredQuantityLabel,
              value: labels.quantityUnit.replace(
                "{count}",
                String(declaredAlbumQuantity)
              ),
            },
            { label: labels.primarySellerLabel, value: primarySeller },
            {
              label: labels.totalEscrowLabel,
              value: convertToLocale({
                amount: totalEscrow,
                currency_code: deal.currency_code,
              }),
            },
            { label: labels.dealLabel, value: deal.title },
          ]}
        />

        <BbSectionHeader
          title={labels.uploadSectionTitle}
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center text-sm text-[#6B7280] whitespace-pre-line">
          {labels.uploadHint}
        </div>

        <AiVerificationPanel
          groupDealId={deal.id}
          mode="purchase"
          uploadLabel={labels.uploadButton}
          resultsSectionId={RECEIPT_ANALYSIS_RESULTS_ID}
          onComplete={setResult}
        />

        <BbButton
          variant="cta"
          disabled={!result}
          onClick={handlePrimaryAction}
        >
          {buttonLabel}
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerPurchaseView
