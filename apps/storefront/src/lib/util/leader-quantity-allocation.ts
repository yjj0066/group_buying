import type { LeaderDealParticipation } from "types/leader-deal-participation"

export type LeaderAllocationRow = {
  participantId: string
  recipientName: string
  memberLabel: string
  requestedQuantity: number
  assignedQuantity: number
  refundQuantity: number
  refundAmount: number
}

export type LeaderAutoAllocationResult = {
  purchasedQuantity: number
  targetQuantity: number
  shortage: number
  assigned: LeaderAllocationRow[]
  refunded: LeaderAllocationRow[]
}

export const computeLeaderAutoAllocation = (
  participations: LeaderDealParticipation[],
  purchasedQuantity: number
): LeaderAutoAllocationResult => {
  const targetQuantity = participations.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  let remaining = purchasedQuantity
  const assigned: LeaderAllocationRow[] = []
  const refunded: LeaderAllocationRow[] = []

  for (const participation of participations) {
    const unitDeposit =
      participation.quantity > 0
        ? participation.deposit_amount / participation.quantity
        : participation.deposit_amount

    if (remaining >= participation.quantity) {
      assigned.push({
        participantId: participation.participant_id,
        recipientName: participation.recipient_name,
        memberLabel: participation.member_label,
        requestedQuantity: participation.quantity,
        assignedQuantity: participation.quantity,
        refundQuantity: 0,
        refundAmount: 0,
      })
      remaining -= participation.quantity
      continue
    }

    if (remaining > 0) {
      const assignedQuantity = remaining
      const refundQuantity = participation.quantity - assignedQuantity

      assigned.push({
        participantId: participation.participant_id,
        recipientName: participation.recipient_name,
        memberLabel: participation.member_label,
        requestedQuantity: participation.quantity,
        assignedQuantity,
        refundQuantity,
        refundAmount: Math.round(unitDeposit * refundQuantity),
      })

      if (refundQuantity > 0) {
        refunded.push({
          participantId: participation.participant_id,
          recipientName: participation.recipient_name,
          memberLabel: participation.member_label,
          requestedQuantity: participation.quantity,
          assignedQuantity,
          refundQuantity,
          refundAmount: Math.round(unitDeposit * refundQuantity),
        })
      }

      remaining = 0
      continue
    }

    refunded.push({
      participantId: participation.participant_id,
      recipientName: participation.recipient_name,
      memberLabel: participation.member_label,
      requestedQuantity: participation.quantity,
      assignedQuantity: 0,
      refundQuantity: participation.quantity,
      refundAmount: participation.deposit_amount,
    })
  }

  return {
    purchasedQuantity,
    targetQuantity,
    shortage: Math.max(0, targetQuantity - purchasedQuantity),
    assigned,
    refunded,
  }
}
