export const formatMessage = (
  template: string,
  values: Record<string, string | number>
): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  )
