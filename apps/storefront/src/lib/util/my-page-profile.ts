import type {
  GroupBuyingPreferences,
  LeaderTrustBadge,
  LeaderTrustProfile,
} from "types/account-group-deals"

export const getIdolInterestTags = (
  preferences: GroupBuyingPreferences
): string[] => {
  const tags = new Set<string>()

  if (preferences.favorite_member?.trim()) {
    tags.add(preferences.favorite_member.trim())
  }

  if (preferences.favorite_idol_group?.trim()) {
    tags.add(preferences.favorite_idol_group.trim())
  }

  return Array.from(tags)
}

export const resolveMyPageRole = (
  preferences: GroupBuyingPreferences,
  trustProfile: LeaderTrustProfile | null
): "leader" | "participant" => {
  if (preferences.preferred_role === "leader" || trustProfile) {
    return "leader"
  }

  return "participant"
}

export const formatTrustBadgeShort = (
  badge: LeaderTrustBadge,
  badgeLabels: Record<LeaderTrustBadge, string>
): string => {
  return badgeLabels[badge]
    .replace(/\s*총대$/, "")
    .replace(/\s+Leader$/, "")
}

export const formatMyPageRoleLine = (input: {
  role: "leader" | "participant"
  trustProfile: LeaderTrustProfile | null
  roleLeaderLabel: string
  roleParticipantLabel: string
  trustSummaryLabel: string
  badgeLabels: Record<LeaderTrustBadge, string>
}): string => {
  const roleLabel =
    input.role === "leader"
      ? input.roleLeaderLabel
      : input.roleParticipantLabel

  if (input.role !== "leader" || !input.trustProfile) {
    return roleLabel
  }

  const score = Math.round(input.trustProfile.trust_score)
  const badgeShort = formatTrustBadgeShort(
    input.trustProfile.badge,
    input.badgeLabels
  )

  const trustPart = input.trustSummaryLabel
    .replace("{score}", String(score))
    .replace("{badge}", badgeShort)

  return `${roleLabel} · ${trustPart}`
}
