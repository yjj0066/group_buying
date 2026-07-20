import { filterDepositConfirmedParticipations } from "@lib/util/leader-order-finalize"
import { maskShippingAddressLine } from "@lib/util/seller-deal-dashboard-data"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

export type ShippingMatchCandidate = {
  participantId: string
  label: string
}

export type ShippingMatchConflict = {
  id: string
  maskedRecipient: string
  maskedAddress: string
  trackingNumber: string
  candidates: ShippingMatchCandidate[]
}

export const maskRecipientName = (name: string): string => {
  const trimmed = name.trim()

  if (trimmed.length <= 1) {
    return trimmed
  }

  if (trimmed.length === 2) {
    return `${trimmed[0]}*`
  }

  return `${trimmed[0]}*${trimmed.slice(-1)}`
}

export const buildShippingMatchConflicts = (
  participations: LeaderDealParticipation[] | null | undefined
): ShippingMatchConflict[] => {
  const confirmed = filterDepositConfirmedParticipations(participations ?? [])
  const groups = new Map<string, LeaderDealParticipation[]>()

  for (const participation of confirmed) {
    const addressKey = participation.address.trim().split(/\s+/).slice(0, 2).join(" ")

    if (!addressKey) {
      continue
    }

    const existing = groups.get(addressKey) ?? []
    existing.push(participation)
    groups.set(addressKey, existing)
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([addressKey, items], index) => ({
      id: `conflict-${index}`,
      maskedRecipient: maskRecipientName(items[0]?.recipient_name ?? ""),
      maskedAddress: maskShippingAddressLine(items[0]?.address ?? "") ?? addressKey,
      trackingNumber: items[0]?.participant_id.slice(-4) ?? "----",
      candidates: items.map((item) => ({
        participantId: item.participant_id,
        label: `${item.recipient_name} (${item.member_label})`,
      })),
    }))
}
