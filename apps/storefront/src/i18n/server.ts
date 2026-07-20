import "server-only"

import { getLocale } from "@lib/data/locale"
import {
  getDictionary,
  medusaLocaleToUiLocale,
  uiLocaleToMedusaCode,
} from "./config"

export const getServerDictionary = async () => {
  const localeCode = await getLocale()
  const uiLocale = medusaLocaleToUiLocale(localeCode)

  return getDictionary(uiLocale)
}

export const getMedusaLocaleCode = async () => {
  const localeCode = await getLocale()
  const uiLocale = medusaLocaleToUiLocale(localeCode)

  return uiLocaleToMedusaCode(uiLocale)
}

export { formatMessage } from "./format-message"
