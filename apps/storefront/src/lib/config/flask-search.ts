// Flask semantic search API base URL.
// In local dev Flask is OFF by default — set SEARCH_API_ENABLED=true when Flask runs on :5000.
const DEFAULT_SEARCH_API_URL = "http://localhost:5000"

const isExplicitlyDisabled = (): boolean =>
  process.env.SEARCH_API_ENABLED === "false" ||
  process.env.AI_ENGINE_ENABLED === "false"

const isExplicitlyEnabled = (): boolean =>
  process.env.SEARCH_API_ENABLED === "true" ||
  process.env.AI_ENGINE_ENABLED === "true"

export const getFlaskSearchApiUrl = (): string | null => {
  const url =
    process.env.NEXT_PUBLIC_SEARCH_API_URL ??
    process.env.AI_ENGINE_URL ??
    process.env.NEXT_PUBLIC_AI_ENGINE_URL ??
    (process.env.NODE_ENV === "production" ? DEFAULT_SEARCH_API_URL : null)

  if (!url?.trim()) {
    return null
  }

  return url.replace(/\/$/, "")
}

export const isFlaskSearchEnabled = (): boolean => {
  if (isExplicitlyDisabled()) {
    return false
  }

  if (process.env.NODE_ENV === "development" && !isExplicitlyEnabled()) {
    return false
  }

  return Boolean(getFlaskSearchApiUrl())
}

export const getFlaskRequestTimeoutMs = (): number => {
  const override = Number(process.env.FLASK_REQUEST_TIMEOUT_MS)

  if (Number.isFinite(override) && override > 0) {
    return override
  }

  return process.env.NODE_ENV === "development" ? 800 : 2500
}
