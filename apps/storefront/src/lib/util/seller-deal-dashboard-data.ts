import { convertToLocale } from "@lib/util/money"
import { filterDepositConfirmedParticipations } from "@lib/util/leader-order-finalize"
import type {
  AccountParticipation,
  ParticipationShippingAddress,
} from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

export type HostedDealParticipant = {
  participant_id: string
  display_name: string
  member_label: string
  amount: number
  currency_code: string
  quantity: number
  deposit_status: "pending" | "paid" | "cancelled" | "expired"
  shipping_region: string | null
  created_at: string
}

export type SellerDealOrderRow = [string, string, string, string, string]

export type MemberFillRow = {
  label: string
  filled: number
  total: number
}

export type VacantSeatOption = {
  key: string
  label: string
  vacantCount: number
}

export type VacantMemberPriceRow = {
  key: string
  optionId: string | null
  label: string
  currentPrice: number
  vacantCount: number
}

export type DealCancelRefundPreview = {
  participantCount: number
  totalAmount: number
}

export type PackingTableRow = [string, string, string, string]

export type MemberQuantityTotal = {
  label: string
  quantity: number
}

const resolveDepositStatus = (
  status: string
): HostedDealParticipant["deposit_status"] => {
  if (status === "pending_deposit") {
    return "pending"
  }

  if (status === "cancelled") {
    return "cancelled"
  }

  if (status === "expired") {
    return "expired"
  }

  return "paid"
}

export const maskShippingRegion = (
  address?: ParticipationShippingAddress | null
): string | null => {
  if (!address?.address_line_1) {
    return null
  }

  return maskShippingAddressLine(address.address_line_1)
}

export const maskShippingAddressLine = (address: string): string | null => {
  const trimmed = address.trim()

  if (!trimmed) {
    return null
  }

  const region = trimmed.split(/\s+/)[0]

  return region ? `${region} ***` : null
}

export const mapParticipationToHostedDealParticipant = (
  participation: AccountParticipation,
  deal: GroupDeal
): HostedDealParticipant => {
  const memberLabel = participation.member_label?.trim() || "-"
  const matchedOption = (deal.options ?? []).find(
    (option) => option.label === memberLabel
  )

  return {
    participant_id: participation.participant_id,
    display_name:
      participation.shipping_address?.recipient_name?.trim() || "참여자",
    member_label: memberLabel,
    amount: matchedOption?.deal_price ?? deal.deal_price ?? 0,
    currency_code: deal.currency_code,
    quantity: participation.quantity || 1,
    deposit_status: resolveDepositStatus(participation.status),
    shipping_region: maskShippingRegion(participation.shipping_address),
    created_at: participation.created_at,
  }
}

export const buildSellerDealOrderRows = (
  participants: HostedDealParticipant[],
  labels: {
    depositPaid: string
    depositPending: string
    shippingEmpty: string
  }
): SellerDealOrderRow[] =>
  participants.map((participant) => [
    participant.display_name,
    participant.member_label,
    convertToLocale({
      amount: participant.amount * participant.quantity,
      currency_code: participant.currency_code,
    }),
    participant.deposit_status === "paid"
      ? labels.depositPaid
      : labels.depositPending,
    participant.shipping_region ?? labels.shippingEmpty,
  ])

export const mapLeaderParticipationToHostedParticipant = (
  participation: LeaderDealParticipation,
  deal: GroupDeal
): HostedDealParticipant => {
  const memberLabel = participation.member_label?.trim() || "-"
  const matchedOption = (deal.options ?? []).find(
    (option) =>
      option.id === participation.option_id || option.label === memberLabel
  )
  const unitAmount =
    matchedOption?.deal_price ??
    (participation.quantity > 0
      ? participation.deposit_amount / participation.quantity
      : participation.deposit_amount) ??
    deal.deal_price ??
    0

  return {
    participant_id: participation.participant_id,
    display_name: participation.recipient_name?.trim() || "참여자",
    member_label: memberLabel,
    amount: unitAmount,
    currency_code: deal.currency_code,
    quantity: participation.quantity || 1,
    deposit_status: resolveDepositStatus(participation.status),
    shipping_region: maskShippingAddressLine(participation.address),
    created_at: new Date(0).toISOString(),
  }
}

export const mapLeaderParticipationsToHostedParticipants = (
  participations: LeaderDealParticipation[] | null | undefined,
  deal: GroupDeal
): HostedDealParticipant[] =>
  (participations ?? []).map((participation) =>
    mapLeaderParticipationToHostedParticipant(participation, deal)
  )

export const buildVacantSeatOptions = (
  deal: GroupDeal,
  participants: HostedDealParticipant[]
): VacantSeatOption[] =>
  buildMemberFillRows(deal, participants)
    .filter((row) => row.total > row.filled)
    .map((row) => ({
      key: row.label,
      label: `${row.label} ${row.total - row.filled}자리`,
      vacantCount: row.total - row.filled,
    }))

export const buildVacantMemberPriceRows = (
  deal: GroupDeal,
  participants: HostedDealParticipant[]
): VacantMemberPriceRow[] => {
  const fillRows = buildMemberFillRows(deal, participants)
  const priceByLabel = new Map<
    string,
    { price: number; optionId: string | null }
  >()

  for (const option of (deal.options ?? []).filter(
    (item) => item.option_type === "member"
  )) {
    priceByLabel.set(option.label, {
      price: option.deal_price,
      optionId: option.id,
    })
  }

  const metadataSeats = deal.metadata?.member_seats

  if (Array.isArray(metadataSeats)) {
    for (const seat of metadataSeats) {
      if (!seat || typeof seat !== "object") {
        continue
      }

      const record = seat as { label?: string; price?: number }
      const label = record.label?.trim()

      if (!label || priceByLabel.has(label)) {
        continue
      }

      priceByLabel.set(label, {
        price: Number(record.price) || deal.deal_price || 0,
        optionId: null,
      })
    }
  }

  return fillRows
    .filter((row) => row.total > row.filled)
    .map((row) => {
      const priceInfo = priceByLabel.get(row.label) ?? {
        price: deal.deal_price ?? 0,
        optionId: null,
      }

      return {
        key: row.label,
        optionId: priceInfo.optionId,
        label: row.label,
        currentPrice: priceInfo.price,
        vacantCount: row.total - row.filled,
      }
    })
}

export const computeDealCancelRefundPreview = (
  participations: LeaderDealParticipation[] | null | undefined
): DealCancelRefundPreview => {
  const confirmed = filterDepositConfirmedParticipations(participations ?? [])

  return {
    participantCount: confirmed.length,
    totalAmount: confirmed.reduce((sum, item) => sum + item.deposit_amount, 0),
  }
}

export const buildPackingTableRows = (
  participations: LeaderDealParticipation[] | null | undefined
): PackingTableRow[] =>
  filterDepositConfirmedParticipations(participations ?? []).map((participation) => [
    participation.recipient_name,
    participation.member_label,
    String(participation.quantity),
    participation.address || "-",
  ])

export const buildMemberQuantityTotals = (
  deal: GroupDeal,
  participations: LeaderDealParticipation[] | null | undefined
): MemberQuantityTotal[] => {
  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )
  const confirmed = filterDepositConfirmedParticipations(participations ?? [])
  const totals = new Map<string, number>()

  for (const option of memberOptions) {
    totals.set(option.label, 0)
  }

  for (const participation of confirmed) {
    const label = participation.member_label?.trim() || "-"
    totals.set(label, (totals.get(label) ?? 0) + participation.quantity)
  }

  if (memberOptions.length) {
    return memberOptions.map((option) => ({
      label: option.label,
      quantity: totals.get(option.label) ?? 0,
    }))
  }

  return Array.from(totals.entries()).map(([label, quantity]) => ({
    label,
    quantity,
  }))
}

export const buildMemberFillRows = (
  deal: GroupDeal,
  participants: HostedDealParticipant[]
): MemberFillRow[] => {
  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  if (memberOptions.length) {
    return memberOptions.map((option) => {
      const filled = participants
        .filter((participant) => participant.member_label === option.label)
        .reduce((sum, participant) => sum + participant.quantity, 0)

      return {
        label: option.label,
        filled,
        total: option.max_quantity ?? 1,
      }
    })
  }

  const metadataSeats = deal.metadata?.member_seats

  if (Array.isArray(metadataSeats)) {
    return metadataSeats
      .map((seat) => {
        if (!seat || typeof seat !== "object") {
          return null
        }

        const record = seat as { label?: string; quantity?: number }
        const label = record.label?.trim()

        if (!label) {
          return null
        }

        const total = Number(record.quantity) || 0
        const filled = participants
          .filter((participant) => participant.member_label === label)
          .reduce((sum, participant) => sum + participant.quantity, 0)

        return { label, filled, total }
      })
      .filter((row): row is MemberFillRow => Boolean(row && row.total > 0))
  }

  return []
}

export const countActiveParticipants = (
  participants: HostedDealParticipant[]
) =>
  participants
    .filter(
      (participant) =>
        participant.deposit_status !== "cancelled" &&
        participant.deposit_status !== "expired"
    )
    .reduce((sum, participant) => sum + participant.quantity, 0)

export const countDepositPaidParticipants = (
  participants: HostedDealParticipant[]
) =>
  participants
    .filter((participant) => participant.deposit_status === "paid")
    .reduce((sum, participant) => sum + participant.quantity, 0)

export const computeRecruitmentAmount = (
  deal: GroupDeal,
  participants: HostedDealParticipant[]
) => {
  if (participants.length) {
    return participants.reduce(
      (sum, participant) => sum + participant.amount * participant.quantity,
      0
    )
  }

  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  if (memberOptions.length) {
    return memberOptions.reduce(
      (sum, option) =>
        sum + option.deal_price * (option.max_quantity ?? 1),
      0
    )
  }

  const metadataSeats = deal.metadata?.member_seats

  if (Array.isArray(metadataSeats)) {
    return metadataSeats.reduce((sum, seat) => {
      if (!seat || typeof seat !== "object") {
        return sum
      }

      const record = seat as { price?: number; quantity?: number }
      const price = Number(record.price) || 0
      const quantity = Number(record.quantity) || 0

      return sum + price * quantity
    }, 0)
  }

  const unitPrice = deal.deal_price || 0
  const total =
    deal.total_seats ?? deal.target_quantity ?? deal.min_participants ?? 0

  return unitPrice * total
}

export const areAllParticipantDepositsPaid = (
  participants: HostedDealParticipant[]
) => {
  const activeParticipants = participants.filter(
    (participant) =>
      participant.deposit_status !== "cancelled" &&
      participant.deposit_status !== "expired"
  )

  return (
    activeParticipants.length > 0 &&
    activeParticipants.every((participant) => participant.deposit_status === "paid")
  )
}
