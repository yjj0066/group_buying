import type { LeaderAutoAllocationResult } from "@lib/util/leader-quantity-allocation"

export type LeaderDistributionMethod = "auto" | "manual"

export type LeaderDistributionDraft = {
  method: LeaderDistributionMethod
  shortage: number
  purchasedQuantity: number
  targetQuantity: number
  autoAllocation?: LeaderAutoAllocationResult
  savedAt: string
}

export const getLeaderDistributionStorageKey = (dealId: string) =>
  `gb-leader-distribution-${dealId}`

export const saveLeaderDistributionDraft = (
  dealId: string,
  draft: LeaderDistributionDraft
) => {
  sessionStorage.setItem(
    getLeaderDistributionStorageKey(dealId),
    JSON.stringify(draft)
  )
}

export const loadLeaderDistributionDraft = (
  dealId: string
): LeaderDistributionDraft | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = sessionStorage.getItem(getLeaderDistributionStorageKey(dealId))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as LeaderDistributionDraft
  } catch {
    return null
  }
}
