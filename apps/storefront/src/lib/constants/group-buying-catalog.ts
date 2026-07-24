export const IDOL_GROUP_SUGGESTIONS = [
  "aespa",
  "IVE",
  "NewJeans",
  "LE SSERAFIM",
  "TWICE",
  "BLACKPINK",
  "ILLIT",
] as const

export const GOODS_TYPE_OPTIONS = [
  "앨범",
  "포토카드",
  "응원봉",
  "MD 세트",
] as const

export type GoodsTypeOption = (typeof GOODS_TYPE_OPTIONS)[number]

/** Site-wide default for leader-created group deals (photocard-only). */
export const DEFAULT_GROUP_BUYING_GOODS_TYPE: GoodsTypeOption = "포토카드"
