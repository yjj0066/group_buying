export type LeaderPurchaseProofDraft = {
  receiptFileName: string | null
  receiptPreviewUrl: string | null
  receiptDataUrl: string | null
  purchasedQuantity: number | null
  totalPaidAmount: number | null
  targetQuantity: number
  submittedAt: string | null
}

export const getLeaderPurchaseProofStorageKey = (dealId: string) =>
  `gb-purchase-proof-${dealId}`

export const createEmptyPurchaseProofDraft = (
  targetQuantity: number
): LeaderPurchaseProofDraft => ({
  receiptFileName: null,
  receiptPreviewUrl: null,
  receiptDataUrl: null,
  purchasedQuantity: null,
  totalPaidAmount: null,
  targetQuantity,
  submittedAt: null,
})

export const loadLeaderPurchaseProofDraft = (
  dealId: string,
  targetQuantity: number
): LeaderPurchaseProofDraft => {
  if (typeof window === "undefined") {
    return createEmptyPurchaseProofDraft(targetQuantity)
  }

  const raw = sessionStorage.getItem(getLeaderPurchaseProofStorageKey(dealId))

  if (!raw) {
    return createEmptyPurchaseProofDraft(targetQuantity)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LeaderPurchaseProofDraft>
    const empty = createEmptyPurchaseProofDraft(targetQuantity)

    return {
      ...empty,
      ...parsed,
      targetQuantity: parsed.targetQuantity ?? targetQuantity,
    }
  } catch {
    return createEmptyPurchaseProofDraft(targetQuantity)
  }
}

export const saveLeaderPurchaseProofDraft = (
  dealId: string,
  draft: LeaderPurchaseProofDraft
) => {
  sessionStorage.setItem(
    getLeaderPurchaseProofStorageKey(dealId),
    JSON.stringify(draft)
  )
}

export const clearLeaderPurchaseProofDraft = (dealId: string) => {
  sessionStorage.removeItem(getLeaderPurchaseProofStorageKey(dealId))
}
