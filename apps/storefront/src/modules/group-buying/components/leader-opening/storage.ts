export type LeaderOpeningMemberCount = {
  label: string
  opened: number
  requested: number
}

export type LeaderOpeningResult = {
  memberCounts: LeaderOpeningMemberCount[]
  totalOpened: number
  declaredAlbumQuantity: number
}

const storageKey = (dealId: string) => `gb-leader-opening-${dealId}`

export const saveLeaderOpeningResult = (
  dealId: string,
  result: LeaderOpeningResult
) => {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(storageKey(dealId), JSON.stringify(result))
}

/** Wireframe OPEN-S preview: 윈터 1장 부족 · 1자리 미배정 */
export const seedWireframeOpeningShortageDemo = (dealId: string) => {
  saveLeaderOpeningResult(dealId, {
    memberCounts: [
      { label: "카리나", opened: 3, requested: 1 },
      { label: "윈터", opened: 0, requested: 1 },
      { label: "닝닝", opened: 2, requested: 1 },
      { label: "지젤", opened: 2, requested: 1 },
    ],
    totalOpened: 7,
    declaredAlbumQuantity: 5,
  })
}

export const loadLeaderOpeningResult = (
  dealId: string
): LeaderOpeningResult | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = sessionStorage.getItem(storageKey(dealId))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as LeaderOpeningResult
  } catch {
    return null
  }
}
