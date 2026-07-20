import type { Dictionary } from "./types"

import {
  DEFAULT_LOCALE_CODE,
  DEFAULT_UI_LOCALE,
  SUPPORTED_LOCALES,
  type UiLocale,
} from "./constants"
import { getDefaultDictionary, isValidDictionary } from "./fallback"
import { mergeDictionary } from "./merge"

const dictionaries: Record<UiLocale, () => Promise<Dictionary>> = {
  ko: () => import("./dictionaries/ko").then((m) => m.default),
  en: () => import("./dictionaries/en").then((m) => m.default),
  es: () => import("./dictionaries/es").then((m) => m.default),
  ru: () => import("./dictionaries/ru").then((m) => m.default),
  zh: () => import("./dictionaries/zh").then((m) => m.default),
  ja: () => import("./dictionaries/ja").then((m) => m.default),
}

export { DEFAULT_LOCALE_CODE, DEFAULT_UI_LOCALE, SUPPORTED_LOCALES, UI_LOCALES } from "./constants"
export type { UiLocale } from "./constants"

export const getDictionary = async (locale: UiLocale): Promise<Dictionary> => {
  const fallback = getDefaultDictionary()

  try {
    const loader = dictionaries[locale] ?? dictionaries[DEFAULT_UI_LOCALE]
    const dictionary = await loader()

    if (!isValidDictionary(dictionary)) {
      return fallback
    }

    if (locale === "ko") {
      return dictionary
    }

    if (locale === "en") {
      return mergeDictionary(fallback, dictionary)
    }

    const enDictionary = await dictionaries.en()

    if (!isValidDictionary(enDictionary)) {
      return mergeDictionary(fallback, dictionary)
    }

    return mergeDictionary(
      mergeDictionary(fallback, enDictionary),
      dictionary
    )
  } catch (error) {
    console.error(
      `[i18n] Failed to load dictionary for "${locale}". Falling back to Korean.`,
      error
    )
    return fallback
  }
}

export const medusaLocaleToUiLocale = (code: string | null): UiLocale => {
  if (!code) {
    return DEFAULT_UI_LOCALE
  }

  const normalized = code.toLowerCase()
  const match = SUPPORTED_LOCALES.find(
    (l) =>
      l.code.toLowerCase() === normalized ||
      l.uiCode.toLowerCase() === normalized ||
      normalized.startsWith(`${l.uiCode.toLowerCase()}-`)
  )

  return match?.uiCode ?? DEFAULT_UI_LOCALE
}

export const uiLocaleToMedusaCode = (uiLocale: UiLocale): string => {
  const match = SUPPORTED_LOCALES.find((l) => l.uiCode === uiLocale)
  return match?.code ?? DEFAULT_LOCALE_CODE
}

export const medusaLocaleToTranslateLang = (code: string): string => {
  const uiLocale = medusaLocaleToUiLocale(code)
  const map: Record<UiLocale, string> = {
    ko: "ko",
    en: "en",
    es: "es",
    ru: "ru",
    zh: "zh-CN",
    ja: "ja",
  }
  return map[uiLocale]
}
