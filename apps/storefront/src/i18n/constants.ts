export const SUPPORTED_LOCALES = [
  { code: "ko-KR", uiCode: "ko", nativeName: "한국어" },
  { code: "en-US", uiCode: "en", nativeName: "English" },
  { code: "es-ES", uiCode: "es", nativeName: "Español" },
  { code: "ru-RU", uiCode: "ru", nativeName: "Русский" },
  { code: "zh-CN", uiCode: "zh", nativeName: "中文" },
  { code: "ja-JP", uiCode: "ja", nativeName: "日本語" },
] as const

export type UiLocale = (typeof SUPPORTED_LOCALES)[number]["uiCode"]

export const DEFAULT_LOCALE_CODE = "ko-KR"
export const DEFAULT_UI_LOCALE: UiLocale = "ko"

export const UI_LOCALES: UiLocale[] = SUPPORTED_LOCALES.map((l) => l.uiCode)

export const LOCALE_COOKIE_NAME = "_medusa_locale"
