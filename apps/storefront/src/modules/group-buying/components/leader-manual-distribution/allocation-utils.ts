import type { LeaderDealParticipation } from "types/leader-deal-participation"

export const buildInitialAllocationMap = (
  participations: LeaderDealParticipation[]
): Record<string, number> => {
  return participations.reduce<Record<string, number>>((acc, participation) => {
    acc[participation.participant_id] = participation.quantity
    return acc
  }, {})
}

export const clampAssignedQuantity = (
  value: number,
  orderedQuantity: number
): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(orderedQuantity, Math.floor(value)))
}

export const sumAssignedQuantities = (
  allocationMap: Record<string, number>
): number => {
  return Object.values(allocationMap).reduce((sum, qty) => sum + qty, 0)
}

export const computeAllocationRemaining = (
  actualPurchaseQty: number,
  allocationMap: Record<string, number>
): number => {
  return actualPurchaseQty - sumAssignedQuantities(allocationMap)
}

export const countPartialRefundParticipants = (
  participations: LeaderDealParticipation[],
  allocationMap: Record<string, number>
): number => {
  return participations.filter(
    (participation) =>
      (allocationMap[participation.participant_id] ?? 0) < participation.quantity
  ).length
}
