import { FetchError } from "@medusajs/js-sdk"

import { formatUploadSizeErrorMessage } from "@lib/util/upload-size-error"

type MedusaError = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
  status?: number
}

const GENERIC_SERVER_ERROR = "An unknown error occurred."

export const isFetchError = (error: unknown): error is FetchError => {
  if (error instanceof FetchError) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const candidate = error as FetchError & { body?: unknown; data?: unknown }

  return (
    typeof candidate.status === "number" ||
    (typeof candidate.statusText === "string" && candidate.statusText.length > 0)
  )
}

const readFetchErrorBodyMessage = (error: FetchError): string | null => {
  const candidate = error as FetchError & {
    body?: unknown
    data?: unknown
  }

  const body = candidate.body ?? candidate.data

  if (typeof body === "string" && body.trim()) {
    return body.trim()
  }

  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message

    if (typeof message === "string" && message.trim()) {
      return message.trim()
    }
  }

  return null
}

const resolveDocumentAiServerMessage = (status: number | undefined): string => {
  if (status === 503) {
    return (
      "Document AI 서비스를 사용할 수 없습니다. BFF의 UPSTAGE_API_KEY와 " +
      "services/document-ai-bff 실행 여부를 확인해 주세요."
    )
  }

  return (
    "서버에서 송장/영수증 분석에 실패했습니다. Medusa 백엔드 터미널 로그를 확인해 주세요. " +
    "DOCUMENT_AI_ENABLED=true 이면 Document AI BFF가 HYBRID_API_URL(기본 http://127.0.0.1:5000)에서 " +
    "실행 중인지, HYBRID_API_SHARED_SECRET 이 BFF와 같은지 확인해 주세요."
  )
}

const resolveGenericServerMessage = (status: number | undefined): string => {
  if (status === 503) {
    return resolveDocumentAiServerMessage(status)
  }

  return (
    "서버 요청 처리에 실패했습니다. Medusa 백엔드 터미널 로그를 확인해 주세요."
  )
}

const isPurchaseReceiptGuardMessage = (message: string): boolean =>
  message.includes("Purchase receipt must be verified") ||
  message.includes("송장/배송은") ||
  message.includes("검증 완료(verified)")

const resolveFetchErrorMessage = (error: FetchError): string => {
  const bodyMessage = readFetchErrorBodyMessage(error)
  const message = bodyMessage || error.message || error.statusText || "Request failed"

  const uploadSizeMessage = formatUploadSizeErrorMessage(message, error.status)

  if (uploadSizeMessage) {
    return uploadSizeMessage
  }

  if (
    message === GENERIC_SERVER_ERROR ||
    message === GENERIC_SERVER_ERROR.slice(0, -1)
  ) {
    return resolveGenericServerMessage(error.status)
  }

  if (isPurchaseReceiptGuardMessage(message)) {
    return message
  }

  if (message.includes("Document AI BFF")) {
    return message
  }

  if (message.includes("HYBRID_API_URL")) {
    return message
  }

  return message
}

const capitalizeMessage = (message: string): string => {
  const trimmed = message.trim()

  if (!trimmed) {
    return trimmed
  }

  const normalized =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1)

  return normalized.endsWith(".") ? normalized : `${normalized}.`
}

export const resolveMedusaErrorMessage = (error: unknown): string => {
  if (isFetchError(error)) {
    return capitalizeMessage(resolveFetchErrorMessage(error))
  }

  const err = error as MedusaError

  if (err.response) {
    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : String(data ?? "Request failed")

    return capitalizeMessage(message)
  }

  if (err.request) {
    return "No response received from the server."
  }

  const message = err.message ?? "Unknown error"

  if (message.includes("fetch failed")) {
    return (
      "백엔드 서버에 연결할 수 없습니다. apps/backend에서 pnpm dev가 실행 중인지 확인해 주세요. (http://localhost:9000)"
    )
  }

  return capitalizeMessage(message)
}

export default function medusaError(error: unknown): never {
  throw new Error(resolveMedusaErrorMessage(error))
}
