import { HttpTypes } from "@medusajs/types"

export type CurrencyOption = {
  currencyCode: string
  countryCode: string
  label: string
}

const PREFERRED_COUNTRY_BY_CURRENCY: Record<string, string> = {
  krw: "kr",
  usd: "us",
  eur: "de",
  jpy: "jp",
  cny: "cn",
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  krw: "₩",
  usd: "$",
  eur: "€",
  jpy: "¥",
  cny: "¥",
}

export const formatCurrencyLabel = (currencyCode: string): string => {
  const normalized = currencyCode.toLowerCase()
  const code = normalized.toUpperCase()
  const symbol = CURRENCY_SYMBOLS[normalized]

  return symbol ? `${code} (${symbol})` : code
}

export const getCurrencyForCountry = (
  regions: HttpTypes.StoreRegion[],
  countryCode: string
): string | null => {
  const normalized = countryCode.toLowerCase()

  for (const region of regions) {
    const matches = region.countries?.some(
      (country) => country.iso_2?.toLowerCase() === normalized
    )

    if (matches) {
      return region.currency_code?.toLowerCase() ?? null
    }
  }

  return null
}

export const getCurrencyOptionsFromRegions = (
  regions: HttpTypes.StoreRegion[]
): CurrencyOption[] => {
  const byCurrency = new Map<string, CurrencyOption>()

  for (const region of regions) {
    const currencyCode = region.currency_code?.toLowerCase()

    if (!currencyCode || byCurrency.has(currencyCode)) {
      continue
    }

    const countries = region.countries ?? []
    const preferredCountry = PREFERRED_COUNTRY_BY_CURRENCY[currencyCode]
    const matchedCountry = countries.find(
      (country) => country.iso_2?.toLowerCase() === preferredCountry
    )
    const countryCode = (
      matchedCountry?.iso_2 ??
      countries[0]?.iso_2 ??
      preferredCountry ??
      ""
    ).toLowerCase()

    if (!countryCode) {
      continue
    }

    byCurrency.set(currencyCode, {
      currencyCode,
      countryCode,
      label: formatCurrencyLabel(currencyCode),
    })
  }

  return Array.from(byCurrency.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

export const getActiveCurrencyOption = (
  options: CurrencyOption[],
  regions: HttpTypes.StoreRegion[],
  countryCode?: string | null
): CurrencyOption | undefined => {
  if (!options.length) {
    return undefined
  }

  if (!countryCode) {
    return options[0]
  }

  const activeCurrency = getCurrencyForCountry(regions, countryCode)

  if (activeCurrency) {
    return (
      options.find((option) => option.currencyCode === activeCurrency) ??
      options[0]
    )
  }

  const normalized = countryCode.toLowerCase()

  return (
    options.find((option) => option.countryCode === normalized) ?? options[0]
  )
}
