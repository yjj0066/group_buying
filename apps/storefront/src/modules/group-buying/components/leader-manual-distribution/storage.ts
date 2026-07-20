export type LeaderManualAllocationEntry = {
  participant_id: string
  assigned_quantity: number
  ordered_quantity: number
}

export type LeaderManualAllocationDraft = {
  actualPurchaseQty: number
  targetQty: number
  shortageAmount: number
  allocations: LeaderManualAllocationEntry[]
  confirmedAt: string | null
}

export const getLeaderManualAllocationStorageKey = (dealId: string) =>
  `gb-manual-allocation-${dealId}`

export const saveLeaderManualAllocationDraft = (
  dealId: string,
  draft: LeaderManualAllocationDraft
) => {
  sessionStorage.setItem(
    getLeaderManualAllocationStorageKey(dealId),
    JSON.stringify(draft)
  )
}

export const loadLeaderManualAllocationDraft = (
  dealId: string
): LeaderManualAllocationDraft | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = sessionStorage.getItem(getLeaderManualAllocationStorageKey(dealId))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as LeaderManualAllocationDraft
  } catch {
    return null
  }
}

export const clearLeaderManualAllocationDraft = (dealId: string) => {
  sessionStorage.removeItem(getLeaderManualAllocationStorageKey(dealId))
}
