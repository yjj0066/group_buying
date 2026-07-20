"use server"

import { cookies as nextCookies } from "next/headers"

import {
  GROUP_BUYING_MODE_COOKIE,
  isGroupBuyingMode,
  modeFromPreferredRole,
  type GroupBuyingMode,
} from "@lib/group-buying/mode"
import {
  retrieveGroupBuyingPreferences,
  updateGroupBuyingPreferences,
} from "@lib/data/account-group-deals"

const readModeCookie = async (): Promise<GroupBuyingMode | null> => {
  try {
    const cookies = await nextCookies()
    const value = cookies.get(GROUP_BUYING_MODE_COOKIE)?.value

    return isGroupBuyingMode(value) ? value : null
  } catch {
    return null
  }
}

export async function getGroupBuyingMode(): Promise<GroupBuyingMode> {
  const cookieMode = await readModeCookie()

  if (cookieMode) {
    return cookieMode
  }

  const preferences = await retrieveGroupBuyingPreferences()

  return modeFromPreferredRole(preferences.preferred_role)
}

export async function setGroupBuyingModeCookie(mode: GroupBuyingMode) {
  const cookies = await nextCookies()

  cookies.set(GROUP_BUYING_MODE_COOKIE, mode, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export async function setGroupBuyingMode(
  mode: GroupBuyingMode,
  options?: { syncAccount?: boolean }
) {
  await setGroupBuyingModeCookie(mode)

  if (options?.syncAccount === false) {
    return mode
  }

  try {
    const updated = await updateGroupBuyingPreferences({
      preferred_role: mode,
    })

    return modeFromPreferredRole(updated.preferred_role)
  } catch {
    return mode
  }
}

export async function syncGroupBuyingModeFromAccount() {
  const preferences = await retrieveGroupBuyingPreferences()
  const mode = modeFromPreferredRole(preferences.preferred_role)

  await setGroupBuyingModeCookie(mode)

  return mode
}

/** Read-only helper for Server Components (cannot set cookies during render). */
export async function ensureGroupBuyingModeCookie() {
  return getGroupBuyingMode()
}
