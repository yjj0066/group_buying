const DEFAULT_HYBRID_API_URL = "http://localhost:5000"

export const HYBRID_PARTNER_SOURCE = "medusa_group_buying"

export const getHybridApiUrl = (): string | null => {
  const url =
    process.env.HYBRID_API_URL ??
    process.env.AI_ENGINE_URL ??
    process.env.FLASK_API_URL ??
    (process.env.NODE_ENV === "production" ? DEFAULT_HYBRID_API_URL : null)

  if (!url?.trim()) {
    return null
  }

  return url.replace(/\/$/, "")
}

export const getHybridApiSharedSecret = (): string | null => {
  const secret =
    process.env.HYBRID_API_SHARED_SECRET ??
    process.env.HYBRID_SHARED_SECRET ??
    null

  return secret?.trim() ? secret.trim() : null
}

export const isDocumentAiExplicitlyDisabled = (): boolean =>
  process.env.DOCUMENT_AI_ENABLED === "false" ||
  process.env.AI_ENGINE_ENABLED === "false"

export const isDocumentAiExplicitlyEnabled = (): boolean =>
  process.env.DOCUMENT_AI_ENABLED === "true" ||
  process.env.AI_ENGINE_ENABLED === "true"

export const isDocumentAiEnabled = (): boolean => {
  if (isDocumentAiExplicitlyDisabled()) {
    return false
  }

  if (process.env.NODE_ENV === "development" && !isDocumentAiExplicitlyEnabled()) {
    return false
  }

  return Boolean(getHybridApiUrl())
}

export const getDocumentAiRequestTimeoutMs = (): number => {
  const override = Number(process.env.DOCUMENT_AI_REQUEST_TIMEOUT_MS)

  if (Number.isFinite(override) && override > 0) {
    return override
  }

  return process.env.NODE_ENV === "development" ? 180000 : 120000
}

export const getDocumentAiAutoVerifyConfidence = (): number => {
  const override = Number(process.env.DOCUMENT_AI_AUTO_VERIFY_CONFIDENCE)

  if (Number.isFinite(override) && override > 0 && override <= 1) {
    return override
  }

  return 0.85
}

export const getBackendPublicUrl = (): string | null => {
  const base =
    process.env.MEDUSA_BACKEND_URL ??
    process.env.BACKEND_PUBLIC_URL ??
    process.env.PUBLIC_BACKEND_URL ??
    null

  if (!base?.trim()) {
    return null
  }

  return base.replace(/\/$/, "")
}

export const buildPublicStaticUrl = (pathOrUrl: string): string | null => {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl
  }

  const base = getBackendPublicUrl()

  if (!base || !pathOrUrl.startsWith("/")) {
    return null
  }

  return `${base}${pathOrUrl}`
}
