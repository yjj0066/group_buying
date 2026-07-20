"use client"

import { useMemo, useState } from "react"

import { convertToLocale } from "@lib/util/money"
import { gbAppRoutes } from "@lib/wireframe/routes"
import DepositForfeitureDialog from "@modules/group-buying/components/deposit-forfeiture-dialog"
import { BbBadge, BbSectionHeader } from "@modules/design-system"
import type { BbBadgeVariant } from "@modules/design-system"
import type { SettlementRecord, SettlementType } from "types/account-group-deals"

type SettlementLabels = {
  empty: string
  title: string
  description: string
  columns: {
    date: string
    type: string
    deal: string
    amount: string
  }
  typeSettlement: string
  typeRefund: string
  typeUnallocatedRefund: string
  typeDepositReturn: string
  typeDepositForfeiture: string
  forfeitureHint: string
  forfeitureDialog: {
    title: string
    dealLabel: string
    reasonLabel: string
    close: string
    objection: string
  }
}

type MySettlementsViewProps = {
  countryCode: string
  settlements: SettlementRecord[]
  labels: SettlementLabels
}

const TYPE_BADGE_VARIANT: Record<SettlementType, BbBadgeVariant> = {
  escrow_release: "success",
  participant_refund: "default",
  unallocated_refund: "warning",
  deposit_refund: "deposit",
  deposit_forfeiture: "danger",
}

const sortByDateDesc = (records: SettlementRecord[]) =>
  [...records].sort((left, right) => {
    const leftTime = left.processed_at
      ? new Date(left.processed_at).getTime()
      : 0
    const rightTime = right.processed_at
      ? new Date(right.processed_at).getTime()
      : 0

    return rightTime - leftTime
  })

const typeLabel = (
  type: SettlementType,
  labels: SettlementLabels
): string => {
  switch (type) {
    case "escrow_release":
      return labels.typeSettlement
    case "participant_refund":
      return labels.typeRefund
    case "unallocated_refund":
      return labels.typeUnallocatedRefund
    case "deposit_refund":
      return labels.typeDepositReturn
    case "deposit_forfeiture":
      return labels.typeDepositForfeiture
    default:
      return labels.typeRefund
  }
}

const MySettlementsView = ({
  countryCode,
  settlements,
  labels,
}: MySettlementsViewProps) => {
  const [selectedForfeiture, setSelectedForfeiture] =
    useState<SettlementRecord | null>(null)

  const rows = useMemo(
    () =>
      sortByDateDesc(settlements).map((record) => ({
        record,
        date: record.processed_at
          ? new Date(record.processed_at).toLocaleDateString("ko-KR")
          : "-",
        type: typeLabel(record.type, labels),
        typeVariant: TYPE_BADGE_VARIANT[record.type],
        deal: record.group_deal_title,
        amount:
          record.amount != null
            ? convertToLocale({
                amount: record.amount,
                currency_code: record.currency_code,
              })
            : "-",
        isForfeiture: record.type === "deposit_forfeiture",
      })),
    [settlements, labels]
  )

  const columns = [
    labels.columns.date,
    labels.columns.type,
    labels.columns.deal,
    labels.columns.amount,
  ]

  return (
    <div className="flex flex-col gap-4">
      <BbSectionHeader title={labels.title} subtitle={labels.description} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--bb-line)] px-4 py-8 text-center text-sm text-[var(--bb-mute)]">
          {labels.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bb-line)]">
          <div
            className="grid bg-[var(--bb-surface)] text-[10px] font-bold text-[var(--bb-mute)]"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            }}
          >
            {columns.map((column) => (
              <div
                key={column}
                className="border-r border-white px-3 py-2 last:border-r-0"
              >
                {column}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <button
              key={row.record.id}
              type="button"
              disabled={!row.isForfeiture}
              onClick={() => {
                if (row.isForfeiture) {
                  setSelectedForfeiture(row.record)
                }
              }}
              className={`grid w-full border-t border-[var(--bb-line)] text-left text-xs text-[var(--bb-ink)] ${
                row.isForfeiture
                  ? "cursor-pointer transition-colors hover:bg-[var(--bb-surface)]"
                  : "cursor-default"
              }`}
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              }}
            >
              <div className="border-r border-[var(--bb-surface)] px-3 py-2.5">
                {row.date}
              </div>
              <div className="border-r border-[var(--bb-surface)] px-3 py-2.5">
                <BbBadge variant={row.typeVariant}>{row.type}</BbBadge>
              </div>
              <div className="border-r border-[var(--bb-surface)] px-3 py-2.5">
                {row.deal}
              </div>
              <div className="px-3 py-2.5 font-semibold">{row.amount}</div>
            </button>
          ))}
        </div>
      )}

      {rows.some((row) => row.isForfeiture) ? (
        <p className="text-xs text-[var(--bb-mute)]">{labels.forfeitureHint}</p>
      ) : null}

      <DepositForfeitureDialog
        open={selectedForfeiture != null}
        onClose={() => setSelectedForfeiture(null)}
        record={selectedForfeiture}
        objectionHref={
          selectedForfeiture
            ? gbAppRoutes.mySupportObjection(
                countryCode,
                selectedForfeiture.id,
                selectedForfeiture.group_deal_id ?? undefined
              )
            : null
        }
        labels={labels.forfeitureDialog}
      />
    </div>
  )
}

export default MySettlementsView
