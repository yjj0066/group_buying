import type { LeaderSettlementBankAccount } from "@lib/util/leader-settlement"

export type LeaderSettlementDraft = {
  bankAccount: LeaderSettlementBankAccount | null
  submittedAt: string | null
}

export const getLeaderSettlementStorageKey = (dealId: string) =>
  `gb-leader-settlement-${dealId}`

export const createEmptyLeaderSettlementDraft = (): LeaderSettlementDraft => ({
  bankAccount: null,
  submittedAt: null,
})

export const loadLeaderSettlementDraft = (
  dealId: string
): LeaderSettlementDraft => {
  if (typeof window === "undefined") {
    return createEmptyLeaderSettlementDraft()
  }

  const raw = sessionStorage.getItem(getLeaderSettlementStorageKey(dealId))

  if (!raw) {
    return createEmptyLeaderSettlementDraft()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LeaderSettlementDraft>
    const empty = createEmptyLeaderSettlementDraft()

    return {
      ...empty,
      ...parsed,
      bankAccount: parsed.bankAccount ?? null,
    }
  } catch {
    return createEmptyLeaderSettlementDraft()
  }
}

export const saveLeaderSettlementDraft = (
  dealId: string,
  draft: LeaderSettlementDraft
) => {
  sessionStorage.setItem(
    getLeaderSettlementStorageKey(dealId),
    JSON.stringify(draft)
  )
}

export const saveLeaderSettlementBankAccount = (
  dealId: string,
  bankAccount: LeaderSettlementBankAccount
) => {
  const draft = loadLeaderSettlementDraft(dealId)

  saveLeaderSettlementDraft(dealId, {
    ...draft,
    bankAccount,
  })
}

export const markLeaderSettlementSubmitted = (dealId: string) => {
  const draft = loadLeaderSettlementDraft(dealId)

  saveLeaderSettlementDraft(dealId, {
    ...draft,
    submittedAt: new Date().toISOString(),
  })
}
