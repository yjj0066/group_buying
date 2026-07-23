import { MedusaError } from "@medusajs/framework/utils"

export const HYBRID_PARTNER_SOURCE = "medusa_group_buying"

const isLoopbackHybridApiUrl = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    )
  } catch {
    return false
  }
}

export const getHybridApiUrl = (): string | null => {
  const url =
    process.env.HYBRID_API_URL ??
    process.env.AI_ENGINE_URL ??
    process.env.FLASK_API_URL ??
    null

  if (!url?.trim()) {
    return null
  }

  const normalized = url.replace(/\/$/, "")

  if (isLoopbackHybridApiUrl(normalized)) {
    const allowLocalBff =
      process.env.NODE_ENV === "development" &&
      isDocumentAiExplicitlyEnabled()

    if (!allowLocalBff) {
      return null
    }
  }

  return normalized
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

/** Dev-only stub parsing. Production receipt/tracking verification requires Upstage via BFF. */
export const shouldUseDocumentAiStub = (): boolean => {
  if (isDocumentAiExplicitlyEnabled()) {
    return false
  }

  if (process.env.NODE_ENV === "production") {
    return false
  }

  return !isDocumentAiEnabled()
}

export const assertDocumentAiBffConfigured = (): void => {
  if (shouldUseDocumentAiStub()) {
    return
  }

  if (!isDocumentAiEnabled()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Document AI BFF (Upstage) is required. Deploy services/document-ai-bff, set DOCUMENT_AI_ENABLED=true, HYBRID_API_URL to the BFF HTTPS URL, and HYBRID_API_SHARED_SECRET on the Medusa backend."
    )
  }

  if (process.env.NODE_ENV === "production" && !getBackendPublicUrl()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "MEDUSA_BACKEND_URL must be set on the Medusa backend in production so Document AI BFF can fetch uploaded documents via input_url (avoids oversized base64 payloads to Upstage)."
    )
  }
}

export const getDocumentAiRequestTimeoutMs = (): number => {
  const override = Number(process.env.DOCUMENT_AI_REQUEST_TIMEOUT_MS)

  if (Number.isFinite(override) && override > 0) {
    return override
  }

  // Upstage receipt/tracking can take ~90s; include BFF fetch + cold start headroom.
  return process.env.NODE_ENV === "development" ? 180000 : 180000
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
