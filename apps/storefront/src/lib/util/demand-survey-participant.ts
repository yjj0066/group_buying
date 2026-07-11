const PARTICIPANT_PREFIX = "demand_survey_participant_"
const JOINED_PREFIX = "demand_survey_joined_"

export const getDemandSurveyParticipantId = (productId: string): string => {
  if (typeof window === "undefined") {
    return ""
  }

  const storageKey = `${PARTICIPANT_PREFIX}${productId}`
  const existing = window.localStorage.getItem(storageKey)

  if (existing) {
    return existing
  }

  const participantId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `participant_${Date.now()}`

  window.localStorage.setItem(storageKey, participantId)

  return participantId
}

export const hasDemandSurveyParticipated = (productId: string): boolean => {
  if (typeof window === "undefined") {
    return false
  }

  return window.localStorage.getItem(`${JOINED_PREFIX}${productId}`) === "true"
}

export const markDemandSurveyParticipated = (productId: string) => {
  if (typeof window === "undefined") {
    return
  }

  getDemandSurveyParticipantId(productId)
  window.localStorage.setItem(`${JOINED_PREFIX}${productId}`, "true")
}
