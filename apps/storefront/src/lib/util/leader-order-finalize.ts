import type { GroupDeal, GroupDealOption } from "types/group-deal"
import {
  isDepositConfirmedLeaderParticipation,
  type LeaderDealParticipation,
} from "types/leader-deal-participation"

export type LeaderFinalizeSummary = {
  participantCount: number
  totalQuantity: number
  totalDepositedAmount: number
}

export type LeaderOptionQuantityRow = {
  optionId: string
  label: string
  quantity: number
}

export type LeaderShippingRow = {
  participantId: string
  recipientName: string
  phone: string
  memberLabel: string
  quantity: number
  address: string
}

export type LeaderFinalizeData = {
  confirmedParticipations: LeaderDealParticipation[]
  summary: LeaderFinalizeSummary
  optionRows: LeaderOptionQuantityRow[]
  shippingRows: LeaderShippingRow[]
}

const sortOptions = (options: GroupDealOption[]) =>
  [...options].sort((left, right) => left.sort_order - right.sort_order)

export const filterDepositConfirmedParticipations = (
  participations: LeaderDealParticipation[]
): LeaderDealParticipation[] =>
  participations.filter(isDepositConfirmedLeaderParticipation)

export const computeLeaderFinalizeData = (
  deal: GroupDeal,
  participations: LeaderDealParticipation[]
): LeaderFinalizeData => {
  const confirmedParticipations = filterDepositConfirmedParticipations(
    participations
  )

  const summary: LeaderFinalizeSummary = {
    participantCount: confirmedParticipations.length,
    totalQuantity: confirmedParticipations.reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
    totalDepositedAmount: confirmedParticipations.reduce(
      (sum, item) => sum + item.deposit_amount,
      0
    ),
  }

  const quantityByOptionId = new Map<string, number>()

  for (const participation of confirmedParticipations) {
    quantityByOptionId.set(
      participation.option_id,
      (quantityByOptionId.get(participation.option_id) ?? 0) +
        participation.quantity
    )
  }

  const dealOptions = sortOptions(deal.options ?? [])
  const knownOptionIds = new Set(dealOptions.map((option) => option.id))

  const optionRows: LeaderOptionQuantityRow[] = dealOptions.map((option) => ({
    optionId: option.id,
    label: option.label,
    quantity: quantityByOptionId.get(option.id) ?? 0,
  }))

  for (const [optionId, quantity] of quantityByOptionId.entries()) {
    if (knownOptionIds.has(optionId)) {
      continue
    }

    const label =
      confirmedParticipations.find((item) => item.option_id === optionId)
        ?.member_label ?? optionId

    optionRows.push({
      optionId,
      label,
      quantity,
    })
  }

  const shippingRows: LeaderShippingRow[] = confirmedParticipations.map(
    (participation) => ({
      participantId: participation.participant_id,
      recipientName: participation.recipient_name,
      phone: participation.phone,
      memberLabel: participation.member_label,
      quantity: participation.quantity,
      address: participation.address,
    })
  )

  return {
    confirmedParticipations,
    summary,
    optionRows,
    shippingRows,
  }
}

const escapeCsvCell = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value)

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export const buildOrderListCsv = (
  dealTitle: string,
  summary: LeaderFinalizeSummary,
  optionRows: LeaderOptionQuantityRow[],
  shippingRows: LeaderShippingRow[],
  labels: {
    dealTitle: string
    participantCount: string
    totalQuantity: string
    totalDeposited: string
    optionTableTitle: string
    optionColumn: string
    quantityColumn: string
    totalRow: string
    shippingTableTitle: string
    nameColumn: string
    phoneColumn: string
    memberColumn: string
    quantityColumnShort: string
    addressColumn: string
  }
): string => {
  const lines: string[] = [
    labels.dealTitle,
    `${labels.dealTitle},${escapeCsvCell(dealTitle)}`,
    `${labels.participantCount},${summary.participantCount}`,
    `${labels.totalQuantity},${summary.totalQuantity}`,
    `${labels.totalDeposited},${summary.totalDepositedAmount}`,
    "",
    labels.optionTableTitle,
    [labels.optionColumn, labels.quantityColumn]
      .map(escapeCsvCell)
      .join(","),
    ...optionRows.map((row) =>
      [row.label, row.quantity].map(escapeCsvCell).join(",")
    ),
    [labels.totalRow, summary.totalQuantity].map(escapeCsvCell).join(","),
    "",
    labels.shippingTableTitle,
    [
      labels.nameColumn,
      labels.phoneColumn,
      labels.memberColumn,
      labels.quantityColumnShort,
      labels.addressColumn,
    ]
      .map(escapeCsvCell)
      .join(","),
    ...shippingRows.map((row) =>
      [
        row.recipientName,
        row.phone,
        row.memberLabel,
        row.quantity,
        row.address,
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ]

  return `\uFEFF${lines.join("\n")}`
}

export const downloadCsvFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
