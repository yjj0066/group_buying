import { MedusaError } from "@medusajs/framework/utils"
import { GroupDealStatus } from "../types/group-buying"

export type AdminGroupDealLike = {
  status: GroupDealStatus | string
  current_participants: number
  starts_at: Date | string
  ends_at: Date | string
  min_participants?: number
}

const TERMINAL_STATUSES = new Set<GroupDealStatus | string>([
  GroupDealStatus.CLOSED,
  GroupDealStatus.FAILED,
  GroupDealStatus.CANCELLED,
])

const UPDATABLE_STATUSES = new Set<GroupDealStatus | string>([
  GroupDealStatus.DRAFT,
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
])

export const assertDealUpdatable = (deal: AdminGroupDealLike): void => {
  if (TERMINAL_STATUSES.has(deal.status)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot update a group deal with status "${deal.status}"`
    )
  }
}

export const assertDealCancellable = (deal: AdminGroupDealLike): void => {
  if (deal.status === GroupDealStatus.CANCELLED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Group deal is already cancelled"
    )
  }

  if (deal.status === GroupDealStatus.CLOSED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot cancel a closed group deal"
    )
  }
}

export const assertDealDeletable = (deal: AdminGroupDealLike): void => {
  if (deal.status !== GroupDealStatus.DRAFT) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only draft group deals can be deleted"
    )
  }

  if (deal.current_participants > 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot delete a group deal that already has participants"
    )
  }
}

export const validateDealSchedule = (input: {
  starts_at?: Date | string
  ends_at?: Date | string
  min_participants?: number
  current_participants?: number
}): void => {
  if (input.starts_at && input.ends_at) {
    const startsAt = new Date(input.starts_at)
    const endsAt = new Date(input.ends_at)

    if (endsAt <= startsAt) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "ends_at must be after starts_at"
      )
    }
  }

  if (
    input.min_participants != null &&
    input.current_participants != null &&
    input.min_participants < input.current_participants
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "min_participants cannot be lower than current_participants"
    )
  }
}

export const assertStatusTransitionAllowed = (
  currentStatus: GroupDealStatus | string,
  nextStatus?: GroupDealStatus
): void => {
  if (!nextStatus || nextStatus === currentStatus) {
    return
  }

  if (!UPDATABLE_STATUSES.has(currentStatus)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot change status from "${currentStatus}"`
    )
  }

  const allowedTargets: Record<string, GroupDealStatus[]> = {
    [GroupDealStatus.DRAFT]: [GroupDealStatus.OPEN, GroupDealStatus.CANCELLED],
    [GroupDealStatus.OPEN]: [
      GroupDealStatus.DRAFT,
      GroupDealStatus.CANCELLED,
    ],
    [GroupDealStatus.MINIMUM_REACHED]: [GroupDealStatus.CANCELLED],
  }

  const allowed = allowedTargets[String(currentStatus)] ?? []

  if (!allowed.includes(nextStatus)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot transition group deal from "${currentStatus}" to "${nextStatus}"`
    )
  }
}
