import "server-only"

import { getLocale } from "@lib/data/locale"
import {
  DEFAULT_UI_LOCALE,
  getDictionary,
  medusaLocaleToUiLocale,
  type UiLocale,
} from "./config"
import { getDefaultDictionary } from "./fallback"
import type { Dictionary } from "./types"

export const getUiLocale = async (): Promise<UiLocale> => {
  try {
    const locale = await getLocale()
    return medusaLocaleToUiLocale(locale)
  } catch {
    return DEFAULT_UI_LOCALE
  }
}

export const getMedusaLocaleCode = async (): Promise<string | null> => {
  try {
    return await getLocale()
  } catch {
    return null
  }
}

export const getServerDictionary = async (): Promise<Dictionary> => {
  try {
    const uiLocale = await getUiLocale()
    const dictionary = await getDictionary(uiLocale)

    return dictionary
  } catch (error) {
    console.error(
      "[i18n] Failed to resolve server dictionary. Falling back to Korean.",
      error
    )
    return getDefaultDictionary()
  }
}

export const formatMessage = (
  template: string,
  values: Record<string, string | number>
): string => {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  )
}
