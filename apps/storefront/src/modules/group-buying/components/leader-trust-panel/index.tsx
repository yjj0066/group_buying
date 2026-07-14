"use client"

import { calculateLeaderTrustScore } from "@lib/util/group-deal-trust"
import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"
import { isDepositSecured } from "types/group-deal"

type LeaderTrustPanelProps = {
  deal: GroupDeal
}

const LeaderTrustPanel = ({ deal }: LeaderTrustPanelProps) => {
  const t = useDictionary()
  const trust = calculateLeaderTrustScore(deal)
  const depositSecured = isDepositSecured(deal)
  const gaugePercent = (trust.score / trust.maxScore) * 100

  return (
    <section className="rounded-2xl border border-ui-border-base bg-gradient-to-br from-slate-50 to-violet-50/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text className="text-xs font-semibold uppercase tracking-wide text-ui-fg-subtle">
            {t.groupBuying.leaderTrustTitle}
          </Text>
          <div className="mt-2 flex items-center gap-2">
            <StarRating stars={trust.stars} />
            <Text className="text-lg font-bold text-ui-fg-base">
              {trust.score.toFixed(1)} / {trust.maxScore}
            </Text>
          </div>
          <Text className="mt-1 text-sm text-ui-fg-subtle">
            {t.groupBuying.leaderTrustLabels[trust.labelKey]}
          </Text>
        </div>

        {depositSecured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            ✓ {t.groupBuying.depositSecuredBadge}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 grid gap-2 text-xs text-ui-fg-subtle small:grid-cols-2">
        <li>
          {depositSecured
            ? t.groupBuying.depositStatusDeposited
            : t.groupBuying.depositStatusPending}
        </li>
        <li>
          {deal.purchase_receipt_status === "verified"
            ? t.groupBuying.receiptVerified
            : t.groupBuying.receiptPending}
        </li>
      </ul>
    </section>
  )
}

const StarRating = ({ stars }: { stars: number }) => {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = stars >= index + 1
        const half = !filled && stars >= index + 0.5

        return (
          <span
            key={index}
            className={
              filled
                ? "text-amber-400"
                : half
                  ? "text-amber-300"
                  : "text-ui-fg-muted"
            }
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

export default LeaderTrustPanel
