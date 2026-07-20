const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const mergeDictionary = <T extends Record<string, unknown>>(
  fallback: T,
  override: Partial<T>
): T => {
  const result = { ...fallback }
  const keys = new Set([
    ...Object.keys(fallback),
    ...Object.keys(override),
  ])

  for (const key of keys) {
    const fallbackVal = fallback[key]
    const overrideVal = override[key]

    if (overrideVal === undefined) {
      continue
    }

    if (isPlainObject(fallbackVal) && isPlainObject(overrideVal)) {
      result[key] = mergeDictionary(fallbackVal, overrideVal) as T[Extract<
        keyof T,
        string
      >]
      continue
    }

    result[key] = overrideVal as T[Extract<keyof T, string>]
  }

  return result
}
