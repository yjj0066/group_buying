"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  buildMemberFillRows,
  mapLeaderParticipationsToHostedParticipants,
} from "@lib/util/seller-deal-dashboard-data"
import {
  buildRequestedQuantityByMember,
  resolveDeclaredAlbumQuantity,
} from "@lib/util/leader-opening-shortage"
import { saveLeaderOpeningResult } from "@modules/group-buying/components/leader-opening/storage"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerOpeningViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const QuantityButton = ({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) => (
  <button
    type="button"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-lg font-bold text-[#6B7280] disabled:opacity-40"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    {label}
  </button>
)

const SellerOpeningView = ({
  deal,
  participations = [],
}: SellerOpeningViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [assignMode, setAssignMode] = useState<"fifo" | "random">("fifo")

  const memberRows = useMemo(() => {
    const participants = mapLeaderParticipationsToHostedParticipants(
      participations,
      deal
    )
    const fillRows = buildMemberFillRows(deal, participants)
    const requestedByMember = buildRequestedQuantityByMember(participations)

    if (fillRows.length) {
      return fillRows.map((row) => ({
        label: row.label,
        seatCount: row.total,
        requested: requestedByMember.get(row.label) ?? row.filled,
      }))
    }

    return Array.from(requestedByMember.entries()).map(([label, requested]) => ({
      label,
      seatCount: requested,
      requested,
    }))
  }, [deal, participations])

  const declaredAlbumQuantity = useMemo(
    () => resolveDeclaredAlbumQuantity(deal),
    [deal]
  )

  const [openedCounts, setOpenedCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(memberRows.map((row) => [row.label, 0]))
  )

  const totalOpened = useMemo(
    () =>
      Object.values(openedCounts).reduce((sum, value) => sum + (value || 0), 0),
    [openedCounts]
  )

  const allocationRows = useMemo(
    () =>
      memberRows.map((row) => {
        const opened = openedCounts[row.label] ?? 0
        const satisfied = opened >= row.requested

        return [
          row.label,
          `${opened}장`,
          `${row.seatCount}자리`,
          satisfied ? "충족" : "부족",
        ]
      }),
    [memberRows, openedCounts]
  )

  const updateOpenedCount = (label: string, next: number) => {
    setOpenedCounts((current) => ({
      ...current,
      [label]: Math.max(0, next),
    }))
  }

  const handleAssign = () => {
    const memberCounts = memberRows.map((row) => ({
      label: row.label,
      opened: openedCounts[row.label] ?? 0,
      requested: row.requested,
    }))

    saveLeaderOpeningResult(deal.id, {
      memberCounts,
      totalOpened,
      declaredAlbumQuantity,
    })

    const hasShortage = memberCounts.some(
      (member) => member.opened < member.requested
    )

    if (hasShortage) {
      router.push(gbAppRoutes.sellerOpeningShortage(countryCode, deal.id))
      return
    }

    router.push(gbAppRoutes.sellerShipping(countryCode, deal.id))
  }

  return (
    <LeaderWireframeShell screenId="OPEN" title="개봉·배정">
      <div className="flex flex-col gap-6">
        <BbSectionHeader
          title="개봉 결과 입력"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs text-[#6B7280]">
          문서 AI 아님 · 총대 직접 입력
        </div>

        <div className="flex flex-col gap-2">
          {memberRows.map((member) => (
            <div
              key={member.label}
              className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <span className="font-semibold text-[#111827]">{member.label}</span>
              <div className="flex items-center gap-2">
                <QuantityButton
                  label="-"
                  disabled={(openedCounts[member.label] ?? 0) <= 0}
                  onClick={() =>
                    updateOpenedCount(
                      member.label,
                      (openedCounts[member.label] ?? 0) - 1
                    )
                  }
                />
                <span className="w-6 text-center text-sm font-bold text-[#111827]">
                  {openedCounts[member.label] ?? 0}
                </span>
                <QuantityButton
                  label="+"
                  onClick={() =>
                    updateOpenedCount(
                      member.label,
                      (openedCounts[member.label] ?? 0) + 1
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <BbKeyValue
          items={[
            { label: "입력 총량", value: `${totalOpened}장` },
            { label: "구매 앨범", value: `${declaredAlbumQuantity}장` },
          ]}
        />

        <BbSectionHeader
          title="개봉 인증샷"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-sm text-[#9CA3AF]">
          전체 포카가 한 장에 보이게
        </div>
        <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs text-[#6B7280]">
          참여자가 사진과 숫자를 육안 대조
        </div>

        <BbSectionHeader
          title="배정"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <BbTable
          columns={["멤버", "나온 수량", "자리 수", "결과"]}
          rows={allocationRows}
        />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 font-semibold ${
              assignMode === "fifo"
                ? "border-[#6B46E5] bg-[#F5F3FF] text-[#6B46E5]"
                : "border-[#E5E7EB] text-[#111827]"
            }`}
            onClick={() => setAssignMode("fifo")}
          >
            선착순 배정
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 font-semibold ${
              assignMode === "random"
                ? "border-[#6B46E5] bg-[#F5F3FF] text-[#6B46E5]"
                : "border-[#E5E7EB] text-[#111827]"
            }`}
            onClick={() => setAssignMode("random")}
          >
            랜덤 배정
          </button>
        </div>

        <BbButton
          variant="cta"
          disabled={!memberRows.length}
          onClick={handleAssign}
        >
          배정 실행
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerOpeningView
