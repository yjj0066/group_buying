export type LeaderDealParticipation = {
  participant_id: string
  recipient_name: string
  phone: string
  address: string
  member_label: string
  option_id: string
  quantity: number
  /** Final allocated quantity after opening/distribution (defaults to quantity) */
  assigned_quantity?: number
  deposit_amount: number
  status: string
  stage?: string
}

export const isDepositConfirmedLeaderParticipation = (
  participation: LeaderDealParticipation
): boolean => {
  if (participation.status === "confirmed") {
    return true
  }

  if (
    participation.status === "payment_complete" ||
    participation.stage === "payment_complete"
  ) {
    return true
  }

  return false
}
