import type {
  AccountParticipation,
  GroupDealParticipationStage,
} from "types/account-group-deals"

export type ParticipationProgressStage =
  | "deposit_confirming"
  | "order_complete"
  | "shipping_prep"
  | "shipping_started"
  | "delivery_complete"

export const PARTICIPATION_PROGRESS_STAGES: ParticipationProgressStage[] = [
  "deposit_confirming",
  "order_complete",
  "shipping_prep",
  "shipping_started",
  "delivery_complete",
]

export const getParticipationProgressStageIndex = (
  stage: ParticipationProgressStage
): number => PARTICIPATION_PROGRESS_STAGES.indexOf(stage)

export const resolveParticipationProgressStage = (
  participation: Pick<
    AccountParticipation,
    "stage" | "status" | "delivery_confirmed_at" | "tracking_number"
  >
): ParticipationProgressStage => {
  if (
    participation.stage === "delivery_confirmed" ||
    participation.delivery_confirmed_at
  ) {
    return "delivery_complete"
  }

  if (participation.stage === "shipping") {
    return "shipping_started"
  }

  if (
    participation.stage === "purchasing" ||
    participation.stage === "opening"
  ) {
    return "shipping_prep"
  }

  if (participation.stage === "payment_complete") {
    return "order_complete"
  }

  if (
    participation.status === "pending_deposit" ||
    participation.status === "pending" ||
    participation.stage === "recruiting"
  ) {
    return "deposit_confirming"
  }

  return "deposit_confirming"
}

export const canChangeParticipationShippingAddress = (
  progressStage: ParticipationProgressStage
): boolean =>
  progressStage === "deposit_confirming" || progressStage === "order_complete"

export const shouldShowParticipationTracking = (
  progressStage: ParticipationProgressStage,
  trackingNumber: string | null
): boolean =>
  Boolean(trackingNumber) &&
  (progressStage === "shipping_started" ||
    progressStage === "delivery_complete")

const BACKEND_STAGE_TO_PROGRESS: Partial<
  Record<GroupDealParticipationStage, ParticipationProgressStage>
> = {
  recruiting: "deposit_confirming",
  payment_complete: "order_complete",
  purchasing: "shipping_prep",
  opening: "shipping_prep",
  shipping: "shipping_started",
  delivery_confirmed: "delivery_complete",
}

export const mapBackendStageToProgressStage = (
  stage: GroupDealParticipationStage
): ParticipationProgressStage => BACKEND_STAGE_TO_PROGRESS[stage] ?? "deposit_confirming"
