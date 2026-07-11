import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

function getBackendUrl() {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

  if (url) {
    return url
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:9000"
  }

  throw new Error(
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL is required in production"
  )
}

export const sdk = new Medusa({
  baseUrl: getBackendUrl(),
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = { ...(init?.headers ?? {}) }

  try {
    const localeHeader = await getLocaleHeader()

    if (localeHeader?.["x-medusa-locale"]) {
      headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
    }
  } catch {}

  init = {
    ...init,
    headers,
  }
  return originalFetch(input, init)
}
