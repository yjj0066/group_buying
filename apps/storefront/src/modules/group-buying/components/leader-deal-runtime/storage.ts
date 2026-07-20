export type LeaderDealRuntimeState = {
  leader_stage: "settled"
  status: "completed"
  settlementSubmittedAt: string
}

export const getLeaderDealRuntimeStorageKey = (dealId: string) =>
  `gb-leader-deal-runtime-${dealId}`

export const loadLeaderDealRuntimeState = (
  dealId: string
): LeaderDealRuntimeState | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = sessionStorage.getItem(getLeaderDealRuntimeStorageKey(dealId))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as LeaderDealRuntimeState
  } catch {
    return null
  }
}

export const saveLeaderDealRuntimeState = (
  dealId: string,
  state: LeaderDealRuntimeState
) => {
  sessionStorage.setItem(
    getLeaderDealRuntimeStorageKey(dealId),
    JSON.stringify(state)
  )
}

export const markLeaderDealSettled = (dealId: string) => {
  saveLeaderDealRuntimeState(dealId, {
    leader_stage: "settled",
    status: "completed",
    settlementSubmittedAt: new Date().toISOString(),
  })
}
