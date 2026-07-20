"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  buildShippingMatchConflicts,
  type ShippingMatchConflict,
} from "@lib/util/leader-shipping-conflicts"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbAlert,
  BbButton,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerShippingConfirmViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const SellerShippingConfirmView = ({
  deal,
  participations = [],
}: SellerShippingConfirmViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [selections, setSelections] = useState<Record<string, string>>({})

  const conflicts = useMemo(
    () => buildShippingMatchConflicts(participations),
    [participations]
  )

  const conflictCount =
    Number(deal.metadata?.tracking_ai_conflict_count ?? 0) || conflicts.length

  const selectCandidate = (conflict: ShippingMatchConflict, participantId: string) => {
    setSelections((current) => ({
      ...current,
      [conflict.id]: participantId,
    }))
  }

  return (
    <LeaderWireframeShell screenId="SHIP-C" title="매칭 확인">
      <div className="flex flex-col gap-6">
        {conflictCount > 0 ? (
          <BbAlert variant="error">
            확인이 필요한 송장 {conflictCount}건
          </BbAlert>
        ) : null}

        <BbSectionHeader
          title="매칭 확인"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs leading-relaxed text-[#6B7280] whitespace-pre-line">
          택배사 캡쳐는 받는분이 &quot;{conflicts[0]?.maskedRecipient ?? "김*지"}&quot;로{"\n"}
          이미 마스킹돼 있어 주소로 매칭합니다
        </div>

        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="flex flex-col gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3"
          >
            <p className="text-sm font-bold text-[#92400E]">
              {conflict.maskedRecipient} · {conflict.maskedAddress}
            </p>
            <p className="text-xs text-[#92400E]">
              송장 {conflict.trackingNumber} · 후보가 {conflict.candidates.length}명입니다
            </p>
            <p className="text-xs text-[#92400E]">
              동일 주소에 동명이인이 있어요
            </p>
            <div className="flex flex-wrap gap-2">
              {conflict.candidates.map((candidate) => {
                const selected = selections[conflict.id] === candidate.participantId

                return (
                  <button
                    key={candidate.participantId}
                    type="button"
                    onClick={() => selectCandidate(conflict, candidate.participantId)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      selected
                        ? "bg-[#6B46E5] text-white"
                        : "border border-[#E5E7EB] bg-white text-[#111827]"
                    }`}
                  >
                    {candidate.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-[#9CA3AF]">
          확인 필요 건만 표시 · 전체 재입력 없음
        </p>

        <BbButton
          variant="cta"
          onClick={() =>
            router.push(gbAppRoutes.sellerSettlement(countryCode, deal.id))
          }
        >
          확인 완료 · 정산으로
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerShippingConfirmView
