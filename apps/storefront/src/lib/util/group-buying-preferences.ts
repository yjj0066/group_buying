import type { GroupBuyingPreferences } from "types/account-group-deals"

export const DEFAULT_GROUP_BUYING_PREFERENCES: GroupBuyingPreferences = {
  favorite_idol_group: null,
  favorite_member: null,
  notify_vacancy: true,
  notify_progress: true,
  payment_settlement_alerts: true,
  marketing_alerts: true,
  preferred_role: "participant",
}

export const readGroupBuyingPreferencesFromMetadata = (
  metadata: Record<string, unknown> | null | undefined
): GroupBuyingPreferences => {
  const raw = metadata?.group_buying_preferences

  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_GROUP_BUYING_PREFERENCES }
  }

  const prefs = raw as Record<string, unknown>

  return {
    favorite_idol_group:
      typeof prefs.favorite_idol_group === "string"
        ? prefs.favorite_idol_group
        : null,
    favorite_member:
      typeof prefs.favorite_member === "string" ? prefs.favorite_member : null,
    notify_vacancy:
      typeof prefs.notify_vacancy === "boolean"
        ? prefs.notify_vacancy
        : DEFAULT_GROUP_BUYING_PREFERENCES.notify_vacancy,
    notify_progress:
      typeof prefs.notify_progress === "boolean"
        ? prefs.notify_progress
        : DEFAULT_GROUP_BUYING_PREFERENCES.notify_progress,
    payment_settlement_alerts:
      typeof prefs.payment_settlement_alerts === "boolean"
        ? prefs.payment_settlement_alerts
        : DEFAULT_GROUP_BUYING_PREFERENCES.payment_settlement_alerts,
    marketing_alerts:
      typeof prefs.marketing_alerts === "boolean"
        ? prefs.marketing_alerts
        : metadata?.marketing_opt_in === false
          ? false
          : DEFAULT_GROUP_BUYING_PREFERENCES.marketing_alerts,
    preferred_role:
      prefs.preferred_role === "leader" ? "leader" : "participant",
  }
}

export const isGbAppOnboardingComplete = (
  metadata: Record<string, unknown> | null | undefined
): boolean => {
  if (metadata?.gb_app_onboarding_completed === true) {
    return true
  }

  const preferences = readGroupBuyingPreferencesFromMetadata(metadata)

  return Boolean(preferences.favorite_idol_group?.trim())
}
