import type { GroupDeal } from "types/group-deal"
import { getDealFillProgress } from "types/group-deal"

export const computeLeaderTargetOrderQuantity = (deal: GroupDeal): number => {
  const { filled } = getDealFillProgress(deal)

  if (filled > 0) {
    return filled
  }

  return deal.current_quantity || deal.target_quantity || deal.min_participants
}
