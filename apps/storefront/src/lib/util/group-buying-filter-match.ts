import {
  GOODS_TYPE_OPTIONS,
  type GoodsTypeOption,
} from "@lib/constants/group-buying-catalog"

const GOODS_TYPE_ALIASES: Record<GoodsTypeOption, string[]> = {
  앨범: ["album", "앨범"],
  포토카드: ["photocard", "포토카드"],
  응원봉: ["lightstick", "응원봉"],
  "MD 세트": ["md", "md set", "season-greeting", "photobook", "md 세트"],
}

export const normalizeGoodsTypeLabel = (
  value: string | null | undefined
): GoodsTypeOption | null => {
  if (!value?.trim()) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  for (const option of GOODS_TYPE_OPTIONS) {
    const aliases = GOODS_TYPE_ALIASES[option]

    if (
      aliases.some((alias) => alias.toLowerCase() === normalized) ||
      option.toLowerCase() === normalized
    ) {
      return option
    }
  }

  return null
}

export const matchesGoodsTypeFilter = (
  dealValue: unknown,
  filterLabel: string
): boolean => {
  if (!filterLabel) {
    return true
  }

  const dealLabel = normalizeGoodsTypeLabel(String(dealValue ?? ""))

  return dealLabel === filterLabel
}

export const matchesIdolGroupFilter = (
  dealValue: unknown,
  filter: string
): boolean => {
  const needle = filter.trim().toLowerCase()

  if (!needle) {
    return true
  }

  const haystack = String(dealValue ?? "")
    .trim()
    .toLowerCase()

  if (!haystack) {
    return false
  }

  return haystack.includes(needle) || needle.includes(haystack)
}
