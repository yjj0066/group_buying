"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  buildVacantMemberPriceRows,
  computeDealCancelRefundPreview,
  mapLeaderParticipationsToHostedParticipants,
} from "@lib/util/seller-deal-dashboard-data"
import { computeSellerDashboardMetrics } from "@lib/util/seller-deal-metrics"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { convertToLocale } from "@lib/util/money"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerSeatsViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const OPTIONS = ["급구 재시도", "가격 인하", "공구 취소"]
const PRICE_STEP = 1000

const clampReducedPrice = (currentPrice: number, nextPrice: number) => {
  if (currentPrice <= 0) {
    return 0
  }

  const maxAllowed = Math.max(0, currentPrice - 1)

  return Math.min(Math.max(0, nextPrice), maxAllowed)
}

const buildInitialReducedPrices = (
  rows: ReturnType<typeof buildVacantMemberPriceRows>
) =>
  Object.fromEntries(
    rows.map((row) => [
      row.key,
      clampReducedPrice(row.currentPrice, row.currentPrice - 5000),
    ])
  )

const SellerSeatsView = ({
  deal,
  participations = [],
}: SellerSeatsViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [selected, setSelected] = useState("급구 재시도")

  const participants = useMemo(
    () => mapLeaderParticipationsToHostedParticipants(participations, deal),
    [participations, deal]
  )

  const metrics = useMemo(
    () => computeSellerDashboardMetrics(deal, participants),
    [deal, participants]
  )

  const vacantPriceRows = useMemo(
    () => buildVacantMemberPriceRows(deal, participants),
    [deal, participants]
  )

  const cancelPreview = useMemo(
    () => computeDealCancelRefundPreview(participations),
    [participations]
  )

  const [reducedPrices, setReducedPrices] = useState<Record<string, number>>(
    () => buildInitialReducedPrices(vacantPriceRows)
  )
  const [bulkReduction, setBulkReduction] = useState("5000")
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    setReducedPrices(buildInitialReducedPrices(vacantPriceRows))
    setApplied(false)
  }, [vacantPriceRows])

  const updateReducedPrice = (key: string, currentPrice: number, value: number) => {
    setApplied(false)
    setReducedPrices((current) => ({
      ...current,
      [key]: clampReducedPrice(currentPrice, value),
    }))
  }

  const adjustReducedPrice = (
    key: string,
    currentPrice: number,
    delta: number
  ) => {
    const currentValue = reducedPrices[key] ?? currentPrice
    updateReducedPrice(key, currentPrice, currentValue + delta)
  }

  const applyBulkReduction = () => {
    const amount = Number(bulkReduction.replace(/\D/g, ""))

    if (!Number.isFinite(amount) || amount <= 0) {
      return
    }

    setApplied(false)
    setReducedPrices(
      Object.fromEntries(
        vacantPriceRows.map((row) => [
          row.key,
          clampReducedPrice(row.currentPrice, row.currentPrice - amount),
        ])
      )
    )
  }

  const hasValidReduction = vacantPriceRows.some((row) => {
    const nextPrice = reducedPrices[row.key] ?? row.currentPrice

    return nextPrice > 0 && nextPrice < row.currentPrice
  })

  const totalReductionAmount = vacantPriceRows.reduce((sum, row) => {
    const nextPrice = reducedPrices[row.key] ?? row.currentPrice
    const delta = Math.max(0, row.currentPrice - nextPrice)

    return sum + delta * row.vacantCount
  }, 0)

  const handleApplyPriceReduction = () => {
    if (!hasValidReduction) {
      return
    }

    const payload = vacantPriceRows.map((row) => ({
      key: row.key,
      optionId: row.optionId,
      label: row.label,
      currentPrice: row.currentPrice,
      newPrice: reducedPrices[row.key] ?? row.currentPrice,
      vacantCount: row.vacantCount,
    }))

    sessionStorage.setItem(
      `gb-deal-price-reduction-${deal.id}`,
      JSON.stringify({
        dealId: deal.id,
        appliedAt: new Date().toISOString(),
        rows: payload,
      })
    )

    setApplied(true)
  }

  return (
    <LeaderWireframeShell screenId="SEAT" title="공석 처리">
      <div className="flex flex-col gap-6">
        {metrics.vacant > 0 ? (
          <BbAlert variant="error">
            마감 D-{metrics.daysLeft} · 공석 {metrics.vacant}자리
          </BbAlert>
        ) : null}

        <BbSectionHeader
          title="어떻게 할까요?"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="flex flex-col gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSelected(option)
                setApplied(false)
              }}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                selected === option
                  ? "border-[#6B46E5] bg-[#F5F3FF] text-[#6B46E5]"
                  : "border-[#E5E7EB] text-[#111827]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {selected === "공구 취소" && (
          <>
            <BbSectionHeader
              title="공구 취소 시"
              className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
            />
            <BbKeyValue
              items={[
                {
                  label: "환불 대상",
                  value: `${cancelPreview.participantCount}명`,
                },
                {
                  label: "환불 총액",
                  value: convertToLocale({
                    amount: cancelPreview.totalAmount,
                    currency_code: deal.currency_code,
                  }),
                },
                { label: "보증금", value: "전액 반환" },
              ]}
            />
            <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs leading-relaxed text-[#6B7280] whitespace-pre-line">
              정원 미달은 총대 귀책이 아니므로{"\n"}보증금은 전액 반환됩니다
            </div>
            <BbButton variant="danger" disabled={!cancelPreview.participantCount}>
              취소 확정
            </BbButton>
          </>
        )}

        {selected === "급구 재시도" && (
          <BbButton
            variant="cta"
            disabled={metrics.vacant <= 0}
            onClick={() =>
              router.push(gbAppRoutes.sellerUrgentFill(countryCode, deal.id))
            }
          >
            공석 급구로 이동
          </BbButton>
        )}
        {selected === "가격 인하" && (
          <>
            <BbSectionHeader
              title="공석 자리 가격 인하"
              subtitle="공석이 남은 멤버 자리만 새 가격을 설정할 수 있습니다. 모집 중에는 인하만 가능합니다."
              className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827] [&_p]:text-xs [&_p]:text-[#6B7280]"
            />

            {vacantPriceRows.length ? (
              <>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <p className="text-xs font-semibold text-[#374151]">
                    일괄 인하 금액
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[#6B7280]">
                      인하 금액 (원)
                      <input
                        className="bb-input w-full"
                        inputMode="numeric"
                        value={bulkReduction}
                        onChange={(event) =>
                          setBulkReduction(
                            event.target.value.replace(/\D/g, "")
                          )
                        }
                      />
                    </label>
                    <BbButton
                      type="button"
                      variant="secondary"
                      onClick={applyBulkReduction}
                    >
                      일괄 적용
                    </BbButton>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1000, 3000, 5000, 10000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setBulkReduction(String(amount))
                          setApplied(false)
                          setReducedPrices(
                            Object.fromEntries(
                              vacantPriceRows.map((row) => [
                                row.key,
                                clampReducedPrice(
                                  row.currentPrice,
                                  row.currentPrice - amount
                                ),
                              ])
                            )
                          )
                        }}
                        className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#374151]"
                      >
                        -{amount.toLocaleString()}원
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {vacantPriceRows.map((row) => {
                    const nextPrice =
                      reducedPrices[row.key] ?? row.currentPrice
                    const reduction = Math.max(0, row.currentPrice - nextPrice)

                    return (
                      <div
                        key={row.key}
                        className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#111827]">
                              {row.label}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              공석 {row.vacantCount}자리
                            </p>
                          </div>
                          <p className="text-xs text-[#6B7280]">
                            현재가{" "}
                            <span className="font-semibold text-[#111827]">
                              {convertToLocale({
                                amount: row.currentPrice,
                                currency_code: deal.currency_code,
                              })}
                            </span>
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[#6B7280]">
                            새 가격 (원)
                            <input
                              className="bb-input w-full"
                              inputMode="numeric"
                              value={nextPrice > 0 ? String(nextPrice) : ""}
                              onChange={(event) => {
                                const value = Number(
                                  event.target.value.replace(/\D/g, "")
                                )

                                updateReducedPrice(
                                  row.key,
                                  row.currentPrice,
                                  Number.isFinite(value) ? value : 0
                                )
                              }}
                            />
                          </label>

                          <div className="flex gap-2">
                            <BbButton
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                adjustReducedPrice(
                                  row.key,
                                  row.currentPrice,
                                  -PRICE_STEP
                                )
                              }
                            >
                              -{PRICE_STEP.toLocaleString()}
                            </BbButton>
                            <BbButton
                              type="button"
                              variant="secondary"
                              disabled={nextPrice >= row.currentPrice}
                              onClick={() =>
                                adjustReducedPrice(
                                  row.key,
                                  row.currentPrice,
                                  PRICE_STEP
                                )
                              }
                            >
                              +{PRICE_STEP.toLocaleString()}
                            </BbButton>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-[#6B7280]">
                          {reduction > 0 ? (
                            <>
                              자리당{" "}
                              <span className="font-semibold text-[#6B46E5]">
                                {convertToLocale({
                                  amount: reduction,
                                  currency_code: deal.currency_code,
                                })}
                              </span>{" "}
                              인하 · 공석 합계{" "}
                              {convertToLocale({
                                amount: reduction * row.vacantCount,
                                currency_code: deal.currency_code,
                              })}
                            </>
                          ) : (
                            "현재가보다 낮은 가격을 입력해 주세요."
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <BbKeyValue
                  items={[
                    {
                      label: "예상 총 인하액",
                      value: convertToLocale({
                        amount: totalReductionAmount,
                        currency_code: deal.currency_code,
                      }),
                    },
                  ]}
                />

                <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
                  적용 시 공석 자리만 새 가격으로 노출됩니다. 이미 참여한
                  참여자 가격은 변경되지 않습니다.
                </div>

                <BbButton
                  variant="cta"
                  disabled={!hasValidReduction}
                  onClick={handleApplyPriceReduction}
                >
                  가격 인하 적용
                </BbButton>

                {applied ? (
                  <BbAlert variant="success">
                    가격 인하가 저장되었습니다. 공석 자리에 새 가격이
                    반영됩니다.
                  </BbAlert>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-[#E5E7EB] px-4 py-6 text-center text-sm text-[#6B7280]">
                현재 인하가 필요한 멤버 자리가 없습니다.
              </div>
            )}
          </>
        )}
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerSeatsView
