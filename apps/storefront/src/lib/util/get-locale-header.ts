/**
 * Product titles are always shown in their original registered language.
 * UI copy is handled by i18n dictionaries and product descriptions are
 * translated on the product detail page only, so we do not send
 * x-medusa-locale to the Medusa Store API.
 */
export async function getLocaleHeader(): Promise<
  Record<string, string> | undefined
> {
  return undefined
}
