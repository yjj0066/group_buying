"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import { computeOpeningShortageSummary } from "@lib/util/leader-opening-shortage"
import { loadLeaderOpeningResult } from "@modules/group-buying/components/leader-opening/storage"
import {
  BbAlert,
  BbButton,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerOpeningShortageViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const SellerOpeningShortageView = ({
  deal,
  participations = [],
}: SellerOpeningShortageViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const summary = useMemo(() => {
    const openingResult = loadLeaderOpeningResult(deal.id)

    return computeOpeningShortageSummary(openingResult, participations)
  }, [deal.id, participations])

  const shortageMembers = summary.memberSummaries.filter(
    (member) => member.difference < 0
  )
  const primaryShortage = shortageMembers[0]

  const comparisonRows = shortageMembers.map((member) => [
    member.label,
    `${member.opened}장`,
    `${member.requested}자리`,
    `${member.difference}장`,
  ])

  const hasOpeningData = summary.memberSummaries.length > 0

  return (
    <LeaderWireframeShell screenId="OPEN-S" title="수량 부족·미배정">
      <div className="flex flex-col gap-6">
        {!hasOpeningData ? (
          <>
            <BbAlert variant="warn">
              OPEN 개봉 결과가 없습니다. OPEN 화면에서 배정 실행하거나, 화면
              점검 페이지에서 데모 데이터를 준비해 주세요.
            </BbAlert>
            <div className="flex flex-wrap gap-2">
              <BbButton
                variant="secondary"
                onClick={() =>
                  router.push(gbAppRoutes.sellerOpening(countryCode, deal.id))
                }
              >
                OPEN 화면으로
              </BbButton>
              <LocalizedClientLink href={gbAppRoutes.sellerWireframeCheck(countryCode).replace(`/${countryCode}`, "")}>
                <BbButton variant="cta">화면 점검으로</BbButton>
              </LocalizedClientLink>
            </div>
          </>
        ) : null}

        {primaryShortage ? (
          <BbAlert variant="error">
            {primaryShortage.label} {Math.abs(primaryShortage.difference)}장 부족
            · {summary.totalUnassigned}자리 미배정
          </BbAlert>
        ) : null}

        {hasOpeningData ? (
          <>
        <BbSectionHeader
          title="배정 비교"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <BbTable
          columns={["멤버", "나온 수량", "자리 수", "부족"]}
          rows={comparisonRows}
        />

        <BbSectionHeader
          title="미배정 처리"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <BbTable
          columns={["참여자", "멤버", "환불액"]}
          rows={summary.refundRows.map((row) => [
            row.recipientName,
            row.memberLabel,
            convertToLocale({
              amount: row.refundAmount,
              currency_code: deal.currency_code,
            }),
          ])}
        />

        <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-xs leading-relaxed text-[#1D4ED8]">
          해당 참여자는 등록 계좌로 자동 환불되고{"\n"}다음 공구 우선권을 받습니다
        </div>
        <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs text-[#6B7280]">
          총대 귀책 아님 · 보증금·신뢰도 영향 없음
        </div>

        <BbButton
          variant="cta"
          disabled={!summary.refundRows.length}
          onClick={() => router.push(gbAppRoutes.sellerShipping(countryCode, deal.id))}
        >
          미배정 확정
        </BbButton>
          </>
        ) : null}
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerOpeningShortageView
