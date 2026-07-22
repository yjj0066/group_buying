"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import { BbAlert, BbButton, BbSectionHeader } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type SellerPurchaseFailedViewProps = {
  deal: GroupDeal
}

const SellerPurchaseFailedView = ({ deal }: SellerPurchaseFailedViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchaseFailed
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [explanation, setExplanation] = useState("")
  const [submitted, setSubmitted] = useState(false)

  return (
    <LeaderWireframeShell screenId="PURC-F" title={labels.title}>
      <div className="flex flex-col gap-5">
        <BbAlert variant="error">{labels.alertMessage}</BbAlert>

        <BbSectionHeader
          title={labels.reasonSectionTitle}
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
          {labels.reasonHint}
        </div>

        <Text className="text-xs text-[#6B7280]">{labels.manualEntryHint}</Text>

        <textarea
          className="bb-input min-h-28 resize-y"
          placeholder={labels.explanationPlaceholder}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
        />

        <div className="flex flex-col gap-3">
          <BbButton
            variant="cta"
            onClick={() => {
              setSubmitted(true)
              router.push(gbAppRoutes.sellerPurchaseProof(countryCode, deal.id))
            }}
          >
            {labels.retryUploadButton}
          </BbButton>
          <BbButton
            variant="secondary"
            onClick={() => router.push(gbAppRoutes.sellerDeal(countryCode, deal.id))}
          >
            {labels.backToDashboardButton}
          </BbButton>
        </div>

        {submitted ? (
          <BbAlert variant="info">{labels.submittedMessage}</BbAlert>
        ) : null}
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerPurchaseFailedView
