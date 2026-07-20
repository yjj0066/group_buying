import {
  resolveParticipationProgressStage,
  type ParticipationProgressStage,
} from "@lib/util/participation-progress-stage"
import type { AccountParticipation } from "types/account-group-deals"

export type ParticipationCardStatusLabels = {
  progressStages: Partial<Record<ParticipationProgressStage, string>>
  stageLabels?: Record<string, string>
  statusCancelled: string
  statusRefunded: string
}

export const resolveParticipationCardStatusLabel = (
  participation: AccountParticipation,
  labels: ParticipationCardStatusLabels
): string => {
  if (participation.status === "cancelled") {
    return labels.statusCancelled
  }

  if (participation.status === "refunded") {
    return labels.statusRefunded
  }

  const progressStage = resolveParticipationProgressStage(participation)

  return (
    labels.progressStages[progressStage] ??
    labels.stageLabels?.[participation.stage] ??
    participation.stage
  )
}

export const isDeliveryCompleteStatus = (
  participation: AccountParticipation
): boolean => {
  return (
    resolveParticipationProgressStage(participation) === "delivery_complete"
  )
}

export const getParticipationReviewStorageKey = (participantId: string) =>
  `gb-review-submitted-${participantId}`

export const hasParticipationReviewSubmitted = (participantId: string) => {
  if (typeof window === "undefined") {
    return false
  }

  return sessionStorage.getItem(getParticipationReviewStorageKey(participantId)) === "1"
}

export const markParticipationReviewSubmitted = (participantId: string) => {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(getParticipationReviewStorageKey(participantId), "1")
}

export const canShowPurchaseConfirm = (
  participation: AccountParticipation
): boolean => {
  return (
    isDeliveryCompleteStatus(participation) &&
    !hasParticipationReviewSubmitted(participation.participant_id)
  )
}
