"use client"

import {
  calculateLeaderTrustScore,
  getLeaderTrustDescriptionKey,
  isFirstTimeLeader,
} from "@lib/util/group-deal-trust"
import { useDictionary } from "@i18n/provider"
import { BbBadge } from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import { isDepositSecured } from "types/group-deal"

type LeaderTrustPanelProps = {
  deal: GroupDeal
}

const tierShortLabel: Record<string, string> = {
  excellent: "골드",
  good: "실버",
  fair: "브론즈",
  caution: "주의",
  newcomer: "신규",
}

const LeaderTrustPanel = ({ deal }: LeaderTrustPanelProps) => {
  const t = useDictionary()
  const trust = calculateLeaderTrustScore(deal)
  const trustLabelKey = getLeaderTrustDescriptionKey(trust.tier)
  const depositSecured = isDepositSecured(deal)
  const firstTimeLeader = isFirstTimeLeader(deal)

  const completedDeals = deal.leader_completed_deals ?? 0
  const avgShipDays =
    (deal.metadata?.avg_ship_days as number | undefined) ?? 4
  const reviewCount =
    (deal.metadata?.review_count as number | undefined) ?? 12
  const reviewScore =
    (deal.metadata?.review_score as number | undefined) ?? 4.6
  const reportCount = (deal.metadata?.report_count as number | undefined) ?? 0

  const statsLine = `완료 ${completedDeals}건 · 평균 발송 ${avgShipDays}일 · 후기 ${reviewCount}건 (${reviewScore}) · 신고 ${reportCount}건`

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm font-bold text-[#111827]">
        {t.groupBuying.leaderTrustTitle}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!firstTimeLeader && trust.score != null && (
          <span className="text-sm font-bold text-[#111827]">
            신뢰도 {trust.score.toFixed(0)}
          </span>
        )}
        {!firstTimeLeader && (
          <BbBadge variant="success" size="md">
            {tierShortLabel[trust.tier] ??
              t.groupBuying.leaderTrustLabels[trustLabelKey]}
          </BbBadge>
        )}
        {depositSecured && (
          <BbBadge variant="deposit" size="md">
            보증금 예치
          </BbBadge>
        )}
        {firstTimeLeader && (
          <BbBadge variant="trust" size="md">
            {t.groupBuying.leaderFirstTimeBadge}
          </BbBadge>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#6B7280]">
        {firstTimeLeader
          ? t.groupBuying.leaderFirstTimeDescription
          : statsLine}
      </p>
    </div>
  )
}

export default LeaderTrustPanel
