import "server-only"

import { cookies as nextCookies } from "next/headers"

import { LOCALE_COOKIE_NAME } from "@i18n/constants"

export const getLocale = async (): Promise<string | null> => {
  try {
    const cookieStore = await nextCookies()
    return cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

export const setLocaleCookie = async (locale: string) => {
  const cookieStore = await nextCookies()
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}
