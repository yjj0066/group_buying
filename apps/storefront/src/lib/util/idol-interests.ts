import type { GroupBuyingPreferences } from "types/account-group-deals"

export type IdolInterest = {
  group: string
  member: string
}

const isIdolInterest = (value: unknown): value is IdolInterest => {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.group === "string" &&
    typeof record.member === "string" &&
    record.group.trim().length > 0
  )
}

export const formatIdolChipLabel = (interest: IdolInterest): string => {
  const group = interest.group.trim()
  const member = interest.member.trim()

  if (member && member !== group) {
    return member
  }

  return group
}

export const parseIdolSearchQuery = (query: string): IdolInterest | null => {
  const trimmed = query.trim()

  if (!trimmed) {
    return null
  }

  const [group, member] = trimmed.includes("·")
    ? trimmed.split("·").map((part) => part.trim())
    : trimmed.includes("/")
      ? trimmed.split("/").map((part) => part.trim())
      : [trimmed, trimmed]

  if (!group) {
    return null
  }

  return {
    group,
    member: member || group,
  }
}

export const readIdolInterestsFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  preferences?: GroupBuyingPreferences
): IdolInterest[] => {
  const raw = metadata?.idol_interests

  if (Array.isArray(raw)) {
    const parsed = raw.filter(isIdolInterest).map((item) => ({
      group: item.group.trim(),
      member: item.member.trim() || item.group.trim(),
    }))

    if (parsed.length > 0) {
      return parsed
    }
  }

  const group = preferences?.favorite_idol_group?.trim()
  const member = preferences?.favorite_member?.trim()

  if (group) {
    return [
      {
        group,
        member: member || group,
      },
    ]
  }

  return []
}

export const readProfileAvatarFromMetadata = (
  metadata: Record<string, unknown> | null | undefined
): string | null => {
  const raw = metadata?.profile_avatar_url

  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}
