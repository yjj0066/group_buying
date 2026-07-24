"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { confirmParticipantDelivery } from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { buildTrackingUrl } from "@lib/util/tracking-link"
import GroupDealAiReportPanel from "@modules/group-buying/components/group-deal-ai-report-panel"
import DealTimeline from "@modules/group-buying/components/deal-timeline"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import type { AccountParticipation } from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"
import { mapAccountGroupDealToGroupDeal } from "@lib/util/map-account-group-deal"
import { convertToLocale } from "@lib/util/money"

type ParticipantReportViewProps = {
  participation: AccountParticipation
  memberLabel?: string
}

const ParticipantReportView = ({
  participation,
  memberLabel = "멤버",
}: ParticipantReportViewProps) => {
  const t = useDictionary()
  const { countryCode } = useParams() as { countryCode: string }
  const labels = t.account.participations
  const reportLabels = labels.report

  const deal = participation.group_deal
  const dealForTimeline = useMemo(
    () => mapAccountGroupDealToGroupDeal(deal) as GroupDeal,
    [deal]
  )

  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const trackingUrl =
    participation.tracking_number &&
    buildTrackingUrl(participation.carrier, participation.tracking_number)

  const handleConfirmDelivery = async () => {
    setIsConfirming(true)
    setConfirmError(null)

    try {
      const result = await confirmParticipantDelivery(
        participation.participant_id
      )

      if (!result.ok) {
        setConfirmError(result.error || labels.confirmDeliveryError)
        return
      }
    } catch {
      setConfirmError(labels.confirmDeliveryError)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
        <Text className="text-sm font-bold text-[#991B1B]">
          {deal.title} · 내 자리: {memberLabel}
        </Text>
        <Text className="mt-1 text-xs text-[#B91C1C]">
          현재 단계: {participation.stage} · 최종 갱신 3분 전 (자동)
        </Text>
      </div>

      <DealTimeline deal={dealForTimeline} />

      <section className="flex flex-col gap-3">
        <BbSectionHeader title="구매 증빙" className="mb-0" />
        <GroupDealAiReportPanel deal={deal} audience="participant" />
      </section>

      <BbCard padding="md">
        <BbSectionHeader title={labels.trackingTitle} className="mb-3" />
        <BbKeyValue
          items={[
            {
              label: "택배사",
              value: participation.carrier ?? "-",
            },
            {
              label: "송장",
              value: participation.tracking_number ?? "-",
            },
            {
              label: "상태",
              value: participation.stage === "shipping" ? "배송완료" : participation.stage,
            },
          ]}
        />
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex"
          >
            <BbButton variant="secondary" size="sm">
              {labels.trackingExternalLink}
            </BbButton>
          </a>
        )}
      </BbCard>

      <BbCard padding="md">
        <BbSectionHeader title={labels.escrowTitle} className="mb-3" />
        <BbKeyValue
          items={[
            {
              label: "내 입금액",
              value: convertToLocale({
                amount: deal.deposit_amount ?? 0,
                currency_code: deal.currency_code,
              }),
            },
            { label: "보관 상태", value: "플랫폼 보관 중" },
          ]}
        />
      </BbCard>

      {confirmError && <BbAlert variant="error">{confirmError}</BbAlert>}

      {participation.stage === "shipping" && !participation.delivery_confirmed_at ? (
        <BbButton
          variant="cta"
          fullWidth
          isLoading={isConfirming}
          onClick={handleConfirmDelivery}
        >
          수령 확인 · 자동확정까지 5일
        </BbButton>
      ) : participation.delivery_confirmed_at ? (
        <BbCard padding="md">
          <Text className="text-sm font-semibold text-emerald-700">
            {labels.deliveryConfirmed}
          </Text>
        </BbCard>
      ) : null}

      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <LocalizedClientLink
          href={`${gbAppRoutes.mySupportDispute(countryCode)}?dealId=${deal.id}&participantId=${participation.participant_id}&type=dispute`}
          className="text-[#6B46E5] underline"
        >
          {labels.disputeTitle}
        </LocalizedClientLink>
        <button type="button" className="text-[#9CA3AF] underline">
          리포트 공유
        </button>
      </div>

      <Text className="text-xs text-[#9CA3AF]">
        {reportLabels.description}
      </Text>
    </div>
  )
}

export default ParticipantReportView
