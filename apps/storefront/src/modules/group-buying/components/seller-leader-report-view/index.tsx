"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { computeLeaderFinalizeData } from "@lib/util/leader-order-finalize"
import { computeOpeningShortageSummary } from "@lib/util/leader-opening-shortage"
import { computeLeaderSettlementBreakdown } from "@lib/util/leader-settlement"
import {
  computeRecruitmentAmount,
  mapLeaderParticipationsToHostedParticipants,
} from "@lib/util/seller-deal-dashboard-data"
import { computeSellerDashboardMetrics } from "@lib/util/seller-deal-metrics"
import { loadLeaderOpeningResult } from "@modules/group-buying/components/leader-opening/storage"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import GroupDealAiReportPanel from "@modules/group-buying/components/group-deal-ai-report-panel"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import { Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { AccountGroupDeal } from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerLeaderReportViewProps = {
  deal: AccountGroupDeal
  groupDeal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const SellerLeaderReportView = ({
  deal,
  groupDeal,
  participations = [],
}: SellerLeaderReportViewProps) => {
  const { countryCode } = useParams() as { countryCode: string }

  const hostedParticipants = useMemo(
    () => mapLeaderParticipationsToHostedParticipants(participations, groupDeal),
    [participations, groupDeal]
  )

  const metrics = useMemo(
    () => computeSellerDashboardMetrics(groupDeal, hostedParticipants),
    [groupDeal, hostedParticipants]
  )

  const finalizeData = useMemo(
    () => computeLeaderFinalizeData(groupDeal, participations),
    [groupDeal, participations]
  )

  const settlement = useMemo(
    () => computeLeaderSettlementBreakdown(groupDeal, participations),
    [groupDeal, participations]
  )

  const openingSummary = useMemo(() => {
    const openingResult = loadLeaderOpeningResult(groupDeal.id)

    return computeOpeningShortageSummary(openingResult, participations)
  }, [groupDeal.id, participations])

  const openingResult = useMemo(
    () => loadLeaderOpeningResult(groupDeal.id),
    [groupDeal.id]
  )

  const fillPercent = metrics.total
    ? Math.round((metrics.filled / metrics.total) * 100)
    : 0

  return (
    <LeaderWireframeShell screenId="RPTG" title="공구 리포트 (총대)">
      <div className="flex flex-col gap-6">
        <div className="rounded-r-xl border-l-4 border-[#6B46E5] bg-[#F5F3FF] px-4 py-3">
          <Text className="text-sm font-bold text-[#111827]">{deal.title}</Text>
          <Text className="mt-1 text-xs text-[#6B7280]">
            현재 단계: {deal.leader_stage} · 진행률 {fillPercent}% · 자동 갱신
          </Text>
        </div>

        <div>
          <BbSectionHeader
            title="모집·입금"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "채움",
                value: `${metrics.filled}/${metrics.total}`,
              },
              {
                label: "입금완료",
                value: `${metrics.depositPaidCount}건`,
              },
              {
                label: "총 보관액",
                value: convertToLocale({
                  amount: finalizeData.summary.totalDepositedAmount,
                  currency_code: deal.currency_code,
                }),
              },
            ]}
          />
        </div>

        <div>
          <BbSectionHeader
            title="구매 증빙 (자동 편입)"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <GroupDealAiReportPanel deal={deal} audience="leader" />
        </div>

        <div>
          <BbSectionHeader
            title="개봉·배정"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "개봉 총량",
                value: `${openingResult?.totalOpened ?? 0}장`,
              },
              {
                label: "배정",
                value: `${finalizeData.summary.participantCount}자리`,
              },
              {
                label: "미배정",
                value: `${openingSummary.totalUnassigned}자리 (환불)`,
              },
            ]}
          />
        </div>

        <div>
          <BbSectionHeader
            title="발송"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "매칭 완료",
                value: `${deal.tracking_ai_matched_count ?? 0}건`,
              },
              {
                label: "확인 필요",
                value: `${deal.tracking_ai_conflict_count ?? 0}건`,
              },
              {
                label: "미입력",
                value: `${Math.max(
                  0,
                  finalizeData.shippingRows.length -
                    (deal.tracking_ai_matched_count ?? 0) -
                    (deal.tracking_ai_conflict_count ?? 0)
                )}건`,
              },
            ]}
          />
        </div>

        <div>
          <BbSectionHeader
            title="정산"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={[
              {
                label: "예상 정산액",
                value: convertToLocale({
                  amount: settlement.finalPayout,
                  currency_code: deal.currency_code,
                }),
              },
              {
                label: "보증금",
                value: deal.deposit_status === "deposited" ? "예치중" : "미예치",
              },
              {
                label: "정산 가능",
                value: `${Math.max(
                  0,
                  finalizeData.summary.participantCount -
                    (deal.tracking_ai_conflict_count ?? 0)
                )}건 대기`,
              },
            ]}
          />
        </div>

        <LocalizedClientLink href={gbAppRoutes.sellerSettlement(countryCode, deal.id)}>
          <BbButton variant="cta">정산 화면으로</BbButton>
        </LocalizedClientLink>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerLeaderReportView
