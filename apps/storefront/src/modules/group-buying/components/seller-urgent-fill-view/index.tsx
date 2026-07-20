"use client"

import { useMemo, useState } from "react"

import {
  buildVacantSeatOptions,
  mapLeaderParticipationsToHostedParticipants,
} from "@lib/util/seller-deal-dashboard-data"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerUrgentFillViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const SellerUrgentFillView = ({
  deal,
  participations = [],
}: SellerUrgentFillViewProps) => {
  const vacantSeats = useMemo(() => {
    const participants = mapLeaderParticipationsToHostedParticipants(
      participations,
      deal
    )

    return buildVacantSeatOptions(deal, participants)
  }, [deal, participations])

  const [selectedSeats, setSelectedSeats] = useState<string[]>(() =>
    vacantSeats.length ? [vacantSeats[0].key] : []
  )
  const [reason, setReason] = useState("")
  const [discount, setDiscount] = useState(false)
  const [registered, setRegistered] = useState(false)

  const selectedVacantCount = vacantSeats
    .filter((seat) => selectedSeats.includes(seat.key))
    .reduce((sum, seat) => sum + seat.vacantCount, 0)

  const toggleSeat = (seatKey: string) => {
    setSelectedSeats((current) =>
      current.includes(seatKey)
        ? current.filter((item) => item !== seatKey)
        : [...current, seatKey]
    )
  }

  return (
    <LeaderWireframeShell screenId="QFIL" title="공석 급구">
      <div className="flex flex-col gap-6">
        <BbSectionHeader
          title="공석 급구"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="flex flex-col gap-2">
          {vacantSeats.map((seat) => (
            <label
              key={seat.key}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm"
            >
              <input
                type="checkbox"
                className="accent-[#6B46E5]"
                checked={selectedSeats.includes(seat.key)}
                onChange={() => toggleSeat(seat.key)}
              />
              {seat.label}
            </label>
          ))}
        </div>

        <input
          className="bb-input"
          placeholder="급구 사유 (선택)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            className="accent-[#6B46E5]"
            checked={discount}
            onChange={(event) => setDiscount(event.target.checked)}
          />
          한시 인하 적용
        </label>

        <BbButton
          variant="cta"
          disabled={!vacantSeats.length || !selectedSeats.length}
          onClick={() => setRegistered(true)}
        >
          급구 등록
        </BbButton>

        {registered && (
          <>
            <BbSectionHeader
              title="매칭 현황"
              className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
            />
            <BbKeyValue
              items={[
                { label: "대기자", value: "0명" },
                { label: "푸시 발송", value: "0건" },
                {
                  label: "채워진 자리",
                  value: `0/${selectedVacantCount || 0}`,
                },
              ]}
            />
            <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs text-[#6B7280]">
              동시 신청은 홀드 배타 락으로 선착순 1명
            </div>
          </>
        )}

        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
          대기자 0명이면 가격 인하를 검토하세요
        </div>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerUrgentFillView
