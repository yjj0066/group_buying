"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"

import {
  countWireframeCheckStatuses,
  LEADER_OPENING_FLOW_CHECKS,
  WIREFRAME_PREVIEW_DEAL_ID,
  type WireframeCheckStatus,
} from "@lib/wireframe/leader-flow-checklist"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { seedWireframeOpeningShortageDemo } from "@modules/group-buying/components/leader-opening/storage"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BbAlert, BbButton, BbSectionHeader } from "@modules/design-system"

const STATUS_LABELS: Record<WireframeCheckStatus, string> = {
  done: "완료",
  partial: "부분",
  missing: "미구현",
}

const STATUS_CLASSES: Record<WireframeCheckStatus, string> = {
  done: "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
  partial: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
  missing: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
}

const SellerWireframeCheckView = () => {
  const { countryCode } = useParams() as { countryCode: string }
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const totals = useMemo(
    () =>
      LEADER_OPENING_FLOW_CHECKS.reduce(
        (acc, screen) => {
          const counts = countWireframeCheckStatuses(screen.items)

          acc.done += counts.done
          acc.partial += counts.partial
          acc.missing += counts.missing

          return acc
        },
        { done: 0, partial: 0, missing: 0 }
      ),
    []
  )

  const handleSeedOpeningShortage = () => {
    seedWireframeOpeningShortageDemo(WIREFRAME_PREVIEW_DEAL_ID)
    setSeedMessage(
      "OPEN-S 데모 데이터가 준비되었습니다. OPEN-S 화면을 열어 확인하세요."
    )
  }

  return (
    <LeaderWireframeShell screenId="QA" title="총대 플로우 화면 점검">
      <div className="flex flex-col gap-6">
        <BbAlert variant="info">
          PURC-F · OPEN · OPEN-S 와이어프레임 대비 구현 상태를 확인하는
          페이지입니다. 각 화면의 보라색 배지({`{screenId}`})로 현재 화면 ID를
          확인할 수 있습니다.
        </BbAlert>

        <BbSectionHeader
          title="점검 요약"
          subtitle={`데모 공구 ID: ${WIREFRAME_PREVIEW_DEAL_ID}`}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["done", totals.done],
              ["partial", totals.partial],
              ["missing", totals.missing],
            ] as const
          ).map(([status, count]) => (
            <div
              key={status}
              className={`rounded-xl border px-4 py-3 text-sm ${STATUS_CLASSES[status]}`}
            >
              <p className="font-semibold">{STATUS_LABELS[status]}</p>
              <p className="mt-1 text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#374151]">
          <p className="font-semibold text-[#111827]">권장 확인 순서</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#6B7280]">
            <li>
              <LocalizedClientLink
                href={gbAppRoutes
                  .sellerPurchaseProof(countryCode, WIREFRAME_PREVIEW_DEAL_ID)
                  .replace(`/${countryCode}`, "")}
                className="text-[#6B46E5] hover:underline"
              >
                PURC
              </LocalizedClientLink>
              {" · "}영수증 업로드 후 검증 실패 시 PURC-F 이동
            </li>
            <li>
              <LocalizedClientLink
                href={gbAppRoutes
                  .sellerOpening(countryCode, WIREFRAME_PREVIEW_DEAL_ID)
                  .replace(`/${countryCode}`, "")}
                className="text-[#6B46E5] hover:underline"
              >
                OPEN
              </LocalizedClientLink>
              {" · "}멤버 수량 입력 후 배정 실행
            </li>
            <li>
              OPEN-S · 아래 &quot;OPEN-S 데모 데이터 준비&quot; 후 화면 열기
            </li>
          </ol>
        </div>

        <BbButton type="button" variant="secondary" onClick={handleSeedOpeningShortage}>
          OPEN-S 데모 데이터 준비 (윈터 1장 부족)
        </BbButton>

        {seedMessage ? <BbAlert variant="success">{seedMessage}</BbAlert> : null}

        <div className="flex flex-col gap-4">
          {LEADER_OPENING_FLOW_CHECKS.map((screen) => {
            const counts = countWireframeCheckStatuses(screen.items)
            const href = screen.resolveHref(
              countryCode,
              WIREFRAME_PREVIEW_DEAL_ID
            )
            const relativeHref = href.replace(`/${countryCode}`, "")

            return (
              <section
                key={screen.screenId}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 text-xs font-semibold text-[#6B46E5]">
                        {screen.screenId}
                      </span>
                      <h3 className="text-sm font-bold text-[#111827]">
                        {screen.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {screen.description}
                    </p>
                    {screen.flowHint ? (
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {screen.flowHint}
                      </p>
                    ) : null}
                  </div>

                  <LocalizedClientLink href={relativeHref}>
                    <BbButton type="button" variant="cta">
                      화면 열기
                    </BbButton>
                  </LocalizedClientLink>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={STATUS_CLASSES.done}>
                    완료 {counts.done}
                  </span>
                  <span className={STATUS_CLASSES.partial}>
                    부분 {counts.partial}
                  </span>
                  <span className={STATUS_CLASSES.missing}>
                    미구현 {counts.missing}
                  </span>
                </div>

                <ul className="mt-4 flex flex-col gap-2">
                  {screen.items.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${STATUS_CLASSES[item.status]}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs font-semibold">
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      {item.note ? (
                        <p className="mt-1 text-xs opacity-80">{item.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerWireframeCheckView
