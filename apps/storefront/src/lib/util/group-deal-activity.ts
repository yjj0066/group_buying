import type {
  AccountGroupDeal,
  AccountParticipation,
} from "types/account-group-deals"
import { resolveParticipationTab } from "types/account-group-deals"

const isActiveHostedDeal = (deal: AccountGroupDeal): boolean => {
  if (deal.status === "completed" || deal.status === "cancelled") {
    return false
  }

  return deal.leader_stage !== "settled"
}

export const hasActiveGroupDeals = (
  hostedDeals: AccountGroupDeal[],
  participations: AccountParticipation[]
): boolean => {
  return (
    hostedDeals.some(isActiveHostedDeal) ||
    participations.some(
      (participation) => resolveParticipationTab(participation) === "active"
    )
  )
}
