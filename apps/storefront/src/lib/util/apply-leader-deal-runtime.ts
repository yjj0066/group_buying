import { loadLeaderDealRuntimeState } from "@modules/group-buying/components/leader-deal-runtime/storage"
import type { GroupDeal } from "types/group-deal"

export const applyLeaderDealRuntimeOverrides = (deal: GroupDeal): GroupDeal => {
  const runtime = loadLeaderDealRuntimeState(deal.id)

  if (!runtime) {
    return deal
  }

  return {
    ...deal,
    status: runtime.status,
    metadata: {
      ...(deal.metadata ?? {}),
      leader_stage: runtime.leader_stage,
      settlement_submitted_at: runtime.settlementSubmittedAt,
    },
  }
}
