import type { Dictionary } from "./types"

import koDictionary from "./dictionaries/ko"

export const isValidDictionary = (
  dictionary: unknown
): dictionary is Dictionary => {
  if (!dictionary || typeof dictionary !== "object") {
    return false
  }

  const dict = dictionary as Dictionary

  return Boolean(
    dict.nav?.storeName &&
      dict.hero?.title &&
      dict.hero?.badge &&
      dict.cart?.title &&
      dict.groupBuying?.title &&
      dict.products?.detailDescription &&
      dict.products?.relatedProducts &&
      dict.products?.addToCart &&
      dict.idol?.demandSurvey?.title &&
      dict.idol?.productionStatus
  )
}

export const getDefaultDictionary = (): Dictionary => {
  return koDictionary
}
