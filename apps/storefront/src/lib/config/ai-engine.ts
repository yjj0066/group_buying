const DEFAULT_AI_ENGINE_URL = "http://localhost:5000"

export const getAiEngineBaseUrl = (): string | null => {
  const url =
    process.env.AI_ENGINE_URL ??
    process.env.NEXT_PUBLIC_AI_ENGINE_URL ??
    (process.env.NODE_ENV === "development" ? DEFAULT_AI_ENGINE_URL : null)

  if (!url?.trim()) {
    return null
  }

  return url.replace(/\/$/, "")
}

export const isAiEngineEnabled = (): boolean => {
  if (process.env.AI_ENGINE_ENABLED === "false") {
    return false
  }

  return Boolean(getAiEngineBaseUrl())
}
