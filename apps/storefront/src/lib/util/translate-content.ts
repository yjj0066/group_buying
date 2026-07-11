import "server-only"

import { unstable_cache } from "next/cache"

import {
  DEFAULT_UI_LOCALE,
  medusaLocaleToTranslateLang,
  medusaLocaleToUiLocale,
  type UiLocale,
} from "@i18n/config"

const MYMEMORY_ERROR_PATTERNS = [
  /MYMEMORY WARNING/i,
  /QUERY LENGTH LIMIT/i,
  /INVALID SOURCE LANGUAGE/i,
  /AUTO\/[A-Z]{2,3} IS AN INVALID/i,
  /NEXT AVAILABLE IN/i,
  /USAGELIMITS/i,
  /PLEASE CONTACT/i,
]

const detectSourceLanguage = (text: string): UiLocale | null => {
  if (/[가-힣]/.test(text)) {
    return "ko"
  }

  if (/[А-Яа-яЁё]/.test(text)) {
    return "ru"
  }

  if (/[\u3040-\u30ff]/.test(text)) {
    return "ja"
  }

  if (/[\u4e00-\u9fff]/.test(text)) {
    return "zh"
  }

  if (/[¿¡ñáéíóúü]/i.test(text)) {
    return "es"
  }

  if (/[A-Za-z]{3,}/.test(text)) {
    return "en"
  }

  return null
}

const isTranslationResponseValid = (
  original: string,
  translated: string
): boolean => {
  if (!translated.trim()) {
    return false
  }

  if (MYMEMORY_ERROR_PATTERNS.some((pattern) => pattern.test(translated))) {
    return false
  }

  if (translated.toUpperCase() === original.toUpperCase()) {
    return false
  }

  return true
}

export const shouldTranslateContent = (
  text: string,
  localeCode: string | null
): boolean => {
  if (!text.trim() || !localeCode) {
    return false
  }

  const uiLocale = medusaLocaleToUiLocale(localeCode)

  if (uiLocale === DEFAULT_UI_LOCALE) {
    return false
  }

  const sourceLocale = detectSourceLanguage(text)

  if (sourceLocale && sourceLocale === uiLocale) {
    return false
  }

  return true
}

const translateWithMyMemory = async (
  text: string,
  targetLang: string
): Promise<string> => {
  if (!text.trim()) {
    return text
  }

  const url = new URL("https://api.mymemory.translated.net/get")
  url.searchParams.set("q", text.slice(0, 500))
  url.searchParams.set("langpair", `ko|${targetLang}`)

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    return text
  }

  const data = (await response.json()) as {
    responseData?: { translatedText?: string }
    responseStatus?: number
    quotaFinished?: boolean
  }

  if (data.quotaFinished || data.responseStatus === 429) {
    return text
  }

  const translated = data.responseData?.translatedText?.trim()

  if (!translated || !isTranslationResponseValid(text, translated)) {
    return text
  }

  return translated
}

const getCachedTranslation = unstable_cache(
  async (text: string, targetLang: string) => {
    return translateWithMyMemory(text, targetLang)
  },
  ["content-translation"],
  { revalidate: 60 * 60 * 24 }
)

export const translateContent = async (
  text: string | null | undefined,
  localeCode: string | null
): Promise<string | null> => {
  if (!text?.trim()) {
    return text ?? null
  }

  if (!shouldTranslateContent(text, localeCode)) {
    return text
  }

  const targetLang = medusaLocaleToTranslateLang(localeCode!)

  try {
    const translated = await getCachedTranslation(text, targetLang)

    if (!isTranslationResponseValid(text, translated)) {
      return text
    }

    return translated
  } catch {
    return text
  }
}

export const translateProductFields = async (
  product: { title?: string | null; description?: string | null },
  localeCode: string | null
) => {
  const descriptionNeedsTranslation =
    product.description &&
    shouldTranslateContent(product.description, localeCode)

  const description = descriptionNeedsTranslation
    ? await translateContent(product.description, localeCode)
    : product.description

  return {
    description: description ?? product.description,
  }
}
