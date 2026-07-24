import type { GroupDeal } from "types/group-deal"
import { isDealSoldOut } from "types/group-deal"

export type CatalogStatusTab = "all" | "in_progress" | "closed"

const CLOSED_STATUSES = new Set<GroupDeal["status"]>([
  "closed",
  "completed",
  "cancelled",
])

const IN_PROGRESS_STATUSES = new Set<GroupDeal["status"]>([
  "open",
  "recruiting",
  "minimum_reached",
  "active",
  "deposit_pending",
])

export const isCatalogDealClosed = (deal: GroupDeal): boolean => {
  if (CLOSED_STATUSES.has(deal.status)) {
    return true
  }

  if (new Date(deal.ends_at).getTime() < Date.now()) {
    return true
  }

  return isDealSoldOut(deal)
}

export const isCatalogDealInProgress = (deal: GroupDeal): boolean =>
  !isCatalogDealClosed(deal)

export const filterDealsByCatalogTab = (
  deals: GroupDeal[],
  tab: CatalogStatusTab
): GroupDeal[] => {
  if (tab === "all") {
    return deals
  }

  if (tab === "closed") {
    return deals.filter(isCatalogDealClosed)
  }

  return deals.filter(isCatalogDealInProgress)
}
