import { filterDepositConfirmedParticipations } from "@lib/util/leader-order-finalize"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import type { LeaderOpeningResult } from "@modules/group-buying/components/leader-opening/storage"

export type OpeningShortageMemberSummary = {
  label: string
  requested: number
  opened: number
  difference: number
}

export type OpeningShortageRefundRow = {
  participantId: string
  recipientName: string
  memberLabel: string
  refundAmount: number
}

export type OpeningShortageSummary = {
  memberSummaries: OpeningShortageMemberSummary[]
  refundRows: OpeningShortageRefundRow[]
  totalUnassigned: number
}

export const resolveDeclaredAlbumQuantity = (deal: GroupDeal): number => {
  const fromMetadata = deal.metadata?.declared_album_quantity

  if (typeof fromMetadata === "number" && fromMetadata > 0) {
    return fromMetadata
  }

  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    const parsed = Number(fromMetadata)

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return deal.target_quantity ?? deal.total_seats ?? 0
}

export const buildRequestedQuantityByMember = (
  participations: LeaderDealParticipation[] | null | undefined
): Map<string, number> => {
  const totals = new Map<string, number>()

  for (const participation of filterDepositConfirmedParticipations(
    participations ?? []
  )) {
    const label = participation.member_label?.trim() || "-"
    totals.set(label, (totals.get(label) ?? 0) + participation.quantity)
  }

  return totals
}

export const computeOpeningShortageSummary = (
  openingResult: LeaderOpeningResult | null,
  participations: LeaderDealParticipation[] | null | undefined
): OpeningShortageSummary => {
  if (!openingResult) {
    return {
      memberSummaries: [],
      refundRows: [],
      totalUnassigned: 0,
    }
  }

  const confirmed = filterDepositConfirmedParticipations(participations ?? [])
  const refundRows: OpeningShortageRefundRow[] = []
  const memberSummaries: OpeningShortageMemberSummary[] = []
  let totalUnassigned = 0

  for (const member of openingResult.memberCounts) {
    const difference = member.opened - member.requested

    memberSummaries.push({
      label: member.label,
      requested: member.requested,
      opened: member.opened,
      difference,
    })

    if (difference >= 0) {
      continue
    }

    const shortage = Math.abs(difference)
    totalUnassigned += shortage

    const affected = confirmed.filter(
      (participation) => participation.member_label?.trim() === member.label
    )
    const refundCandidates = affected.slice(-shortage)

    for (const participation of refundCandidates) {
      refundRows.push({
        participantId: participation.participant_id,
        recipientName: participation.recipient_name,
        memberLabel: participation.member_label,
        refundAmount: participation.deposit_amount,
      })
    }
  }

  return {
    memberSummaries,
    refundRows,
    totalUnassigned,
  }
}
