import type { PreferredRole } from "types/account-group-deals"

export const GROUP_BUYING_MODE_COOKIE = "_gb_activity_mode"

export type GroupBuyingMode = PreferredRole

export const DEFAULT_GROUP_BUYING_MODE: GroupBuyingMode = "participant"

export const isGroupBuyingMode = (value: unknown): value is GroupBuyingMode =>
  value === "participant" || value === "leader"

export const modeFromPreferredRole = (role: PreferredRole): GroupBuyingMode => role

export const modeToPreferredRole = (mode: GroupBuyingMode): PreferredRole => mode

export const modeToggleIndex = (mode: GroupBuyingMode): 0 | 1 =>
  mode === "leader" ? 1 : 0

export const modeFromToggleIndex = (index: 0 | 1): GroupBuyingMode =>
  index === 1 ? "leader" : "participant"

export const isLeaderModePath = (pathAfterCountry: string) =>
  pathAfterCountry.startsWith("/seller/") ||
  pathAfterCountry === "/seller/create" ||
  pathAfterCountry.startsWith("/my/hosted")

export const isParticipantModePath = (pathAfterCountry: string) =>
  pathAfterCountry.startsWith("/participations") ||
  pathAfterCountry.startsWith("/reviews/") ||
  pathAfterCountry.startsWith("/disputes/") ||
  (pathAfterCountry.startsWith("/deals/") &&
    !pathAfterCountry.includes("/seller/"))

export const resolveModeRedirectPath = (
  mode: GroupBuyingMode,
  pathAfterCountry: string
): string | null => {
  if (mode === "participant" && isLeaderModePath(pathAfterCountry)) {
    return "/home"
  }

  return null
}
