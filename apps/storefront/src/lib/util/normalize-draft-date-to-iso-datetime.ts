export const normalizeDraftDateToIsoDateTime = (
  value: string | null | undefined,
  { endOfDay = false }: { endOfDay?: boolean } = {}
): string | null => {
  if (!value?.trim()) {
    return null
  }

  const trimmed = value.trim()

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return new Date(trimmed).toISOString()
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = endOfDay ? "T23:59:59" : "T00:00:00"
    return new Date(`${trimmed}${suffix}`).toISOString()
  }

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, mm, dd, yyyy] = mdy
    const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
    return normalizeDraftDateToIsoDateTime(isoDate, { endOfDay })
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  return null
}
