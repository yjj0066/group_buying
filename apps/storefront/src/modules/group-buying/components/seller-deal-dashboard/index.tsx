"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { useDictionary, formatMessage } from "@i18n/provider"
import { applyLeaderDealRuntimeOverrides } from "@lib/util/apply-leader-deal-runtime"
import {
  buildMemberFillRows,
  buildSellerDealOrderRows,
  type HostedDealParticipant,
} from "@lib/util/seller-deal-dashboard-data"
import {
  computeSellerDashboardMetrics,
  resolveLeaderDealStatusBadgeKey,
} from "@lib/util/seller-deal-metrics"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbAlert,
  BbButton,
  BbKpiGrid,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type SellerDealDashboardProps = {
  deal: GroupDeal
  participants?: HostedDealParticipant[]
}

const SellerDealDashboard = ({
  deal,
  participants = [],
}: SellerDealDashboardProps) => {
  const t = useDictionary()
  const dash = t.account.hostedDeals.dashboard
  const { countryCode } = useParams() as { countryCode: string }
  const [dealWithRuntime, setDealWithRuntime] = useState(deal)

  useEffect(() => {
    setDealWithRuntime(applyLeaderDealRuntimeOverrides(deal))
  }, [deal])

  const metrics = useMemo(
    () => computeSellerDashboardMetrics(dealWithRuntime, participants),
    [dealWithRuntime, participants]
  )

  const orderRows = useMemo(
    () =>
      buildSellerDealOrderRows(participants, {
        depositPaid: dash.depositPaid,
        depositPending: dash.depositPending,
        shippingEmpty: dash.shippingEmpty,
      }),
    [participants, dash.depositPaid, dash.depositPending, dash.shippingEmpty]
  )

  const memberFillRows = useMemo(
    () => buildMemberFillRows(dealWithRuntime, participants),
    [dealWithRuntime, participants]
  )

  const statusBadgeKey = resolveLeaderDealStatusBadgeKey(dealWithRuntime)
  const statusBadgeLabel = dash.statusBadges[statusBadgeKey]

  return (
    <LeaderWireframeShell screenId="DASH" title={dash.title}>
      <div className="flex flex-col gap-6">
        <div className="bb-input flex items-center justify-between text-sm font-semibold text-[#111827]">
          <span className="truncate">{deal.title}</span>
          <span className="text-[#9CA3AF]">▾</span>
        </div>

        {metrics.vacant > 0 ? (
          <BbAlert variant="error">
            {formatMessage(dash.urgentBannerShort, {
              days: String(metrics.daysLeft),
              vacant: String(metrics.vacant),
            })}{" "}
            <LocalizedClientLink
              href={gbAppRoutes.sellerUrgentFill(countryCode, deal.id)}
              className="font-bold underline"
            >
              {dash.urgentFillLink}
            </LocalizedClientLink>
          </BbAlert>
        ) : null}

        <BbKpiGrid
          columns={4}
          items={[
            {
              label: dash.kpiFilled,
              value: `${metrics.filled}/${metrics.total}`,
            },
            {
              label: dash.kpiDeposit,
              value: `${metrics.depositPaidCount}/${metrics.filled}`,
            },
            { label: dash.kpiVacant, value: String(metrics.vacant) },
            { label: dash.kpiDaysLeft, value: `D-${metrics.daysLeft}` },
          ]}
        />

        <div>
          <BbSectionHeader
            title={dash.ordersTitle}
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbTable
            columns={[
              dash.orderNickname,
              dash.orderMember,
              dash.orderAmount,
              dash.orderDeposit,
              dash.orderShipping,
            ]}
            rows={orderRows}
          />
          <BbButton
            variant="secondary"
            size="sm"
            className="mt-3 h-9 rounded-lg border-[#E5E7EB] text-xs"
          >
            {dash.excelDownload}
          </BbButton>
        </div>

        <div>
          <BbSectionHeader
            title={dash.depositSectionTitle}
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3">
            <Text className="text-xs leading-relaxed text-[#6B7280]">
              {dash.depositAutoNote}
            </Text>
            <Text className="mt-2 text-xs font-semibold text-[#111827]">
              {dash.depositSummary
                .replace("{paid}", String(metrics.depositPaidCount))
                .replace("{total}", String(metrics.filled))}
            </Text>
          </div>
        </div>

        <div>
          <BbSectionHeader
            title={dash.seatFillTitle}
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <div className="flex flex-col gap-2">
            {memberFillRows.map((row) => {
                const percent = row.total
                  ? Math.round((row.filled / row.total) * 100)
                  : 0
                const isFilled = row.total > 0 && row.filled >= row.total

                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs font-semibold text-[#111827]">
                      {row.label}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className={`h-full rounded-full ${
                          isFilled ? "bg-[#6B46E5]" : "bg-[#EF4444]"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-[#6B7280]">
                    {row.filled}/{row.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <Text className="text-xs text-[#6B7280]">
          {statusBadgeLabel} ·{" "}
          {convertToLocale({
            amount: metrics.totalRecruitmentAmount,
            currency_code: deal.currency_code,
          })}
        </Text>

        <div className="flex flex-wrap gap-3">
          <LocalizedClientLink href={gbAppRoutes.sellerSeats(countryCode, deal.id)}>
            <BbButton variant="secondary">{dash.seatsAction}</BbButton>
          </LocalizedClientLink>
          <LocalizedClientLink href={gbAppRoutes.sellerDealReport(countryCode, deal.id)}>
            <BbButton variant="secondary">{dash.reportAction}</BbButton>
          </LocalizedClientLink>
        </div>

        {metrics.allDepositsPaid ? (
          <LocalizedClientLink href={gbAppRoutes.sellerPacking(countryCode, deal.id)}>
            <BbButton variant="cta">{dash.packingCta}</BbButton>
          </LocalizedClientLink>
        ) : (
          <BbButton
            variant="cta"
            className="disabled:bg-[#DFDCEA] disabled:text-[#9CA3AF]"
            disabled
          >
            {dash.packingCtaDisabled}
          </BbButton>
        )}
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerDealDashboard
