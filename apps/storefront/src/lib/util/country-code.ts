export const normalizeCountryCode = (countryCode?: string | null): string => {
  return (countryCode ?? "").trim().toLowerCase()
}

export const resolveCountryCode = (countryCode?: string | null): string => {
  const normalized = normalizeCountryCode(countryCode)

  if (normalized) {
    return normalized
  }

  return normalizeCountryCode(
    process.env.NEXT_PUBLIC_DEFAULT_REGION || "kr"
  )
}
