import { MedusaError } from "@medusajs/framework/utils"

import {
  buildPublicStaticUrl,
  getDocumentAiRequestTimeoutMs,
  getHybridApiSharedSecret,
  getHybridApiUrl,
  HYBRID_PARTNER_SOURCE,
  isDocumentAiEnabled,
} from "./hybrid-api-config"

export type FlaskDocumentAiJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "succeeded"
  | "done"

export type FlaskDocumentAiJob = {
  id: string
  job_type?: string | null
  status: FlaskDocumentAiJobStatus | string
  confidence?: number | null
  needs_review?: boolean | null
  review_reason?: string | null
  masked_output_url?: string | null
  parse_result_json?: Record<string, unknown> | null
  extract_result_json?: Record<string, unknown> | null
  error_message?: string | null
}

export type FlaskDocumentAiParseResponse = {
  job: FlaskDocumentAiJob
}

export type FlaskDocumentAiParseInput = {
  partner_group_deal_id: string
  partner_participant_id?: string | null
  partner_document_id?: string | null
  input_url?: string | null
  input_base64?: string | null
  input_file_name?: string | null
  input_mime_type?: string | null
  input_payload_json?: Record<string, unknown> | null
}

const RETRYABLE_BFF_STATUS = new Set([502, 503, 504])

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutMs = getDocumentAiRequestTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const buildHybridHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  const secret = getHybridApiSharedSecret()

  if (secret) {
    headers["X-Hybrid-Shared-Secret"] = secret
  }

  return headers
}

const buildParsePayload = (input: FlaskDocumentAiParseInput) => ({
  partner_source: HYBRID_PARTNER_SOURCE,
  partner_group_deal_id: input.partner_group_deal_id,
  partner_participant_id: input.partner_participant_id ?? null,
  partner_document_id: input.partner_document_id ?? null,
  input_url: input.input_url ?? null,
  input_base64: input.input_base64 ?? null,
  input_file_name: input.input_file_name ?? null,
  input_mime_type: input.input_mime_type ?? null,
  input_payload_json: input.input_payload_json ?? null,
})

const resolveStoredDocumentUrl = (
  storedPathOrUrl: string | null | undefined
): string | null => {
  if (!storedPathOrUrl?.trim()) {
    return null
  }

  if (
    storedPathOrUrl.startsWith("http://") ||
    storedPathOrUrl.startsWith("https://")
  ) {
    return storedPathOrUrl
  }

  if (storedPathOrUrl.startsWith("/static/")) {
    return buildPublicStaticUrl(storedPathOrUrl)
  }

  return null
}

/** Prefer input_url so Medusa→BFF requests stay small; BFF fetches the file for Upstage. */
export const buildFlaskDocumentInput = (
  input: FlaskDocumentAiParseInput & {
    stored_document_url?: string | null
  }
): FlaskDocumentAiParseInput => {
  const resolvedUrl =
    resolveStoredDocumentUrl(input.input_url) ??
    resolveStoredDocumentUrl(input.stored_document_url) ??
    resolveStoredDocumentUrl(input.input_base64)

  if (resolvedUrl) {
    return {
      ...input,
      input_url: resolvedUrl,
      input_base64: null,
    }
  }

  return input
}

export const describeInvalidFlaskResponse = (
  status: number,
  bodyText: string
): string => {
  const preview = bodyText.trim().replace(/\s+/g, " ").slice(0, 180)
  const looksHtml = /^\s*</.test(bodyText.trim())

  if (status === 401) {
    return (
      "Document AI BFF 인증에 실패했습니다. Medusa의 HYBRID_API_SHARED_SECRET과 BFF의 HYBRID_SHARED_SECRET이 동일한지 확인해 주세요."
    )
  }

  if (status === 413) {
    return "Document AI BFF 요청 용량이 너무 큽니다. MEDUSA_BACKEND_URL을 설정해 input_url 방식으로 전송되는지 확인해 주세요."
  }

  if (RETRYABLE_BFF_STATUS.has(status)) {
    return (
      `Document AI BFF(Upstage)가 일시적으로 응답하지 않습니다(HTTP ${status}). ` +
      "Render BFF cold start 또는 Upstage 지연일 수 있습니다. 1~2분 후 다시 시도해 주세요."
    )
  }

  if (looksHtml) {
    return (
      `Document AI BFF가 JSON 대신 HTML 오류 페이지를 반환했습니다(HTTP ${status}). ` +
      "BFF 배포 상태와 Render 로그를 확인해 주세요."
    )
  }

  if (preview) {
    return (
      `Document AI BFF(Upstage) 응답을 해석할 수 없습니다(HTTP ${status}). ` +
      `응답 미리보기: ${preview}`
    )
  }

  return (
    `Document AI BFF(Upstage) 응답을 해석할 수 없습니다(HTTP ${status}). ` +
    "BFF URL(HYBRID_API_URL)과 UPSTAGE_API_KEY 설정을 확인해 주세요."
  )
}

const parseFlaskResponse = async (
  response: Response
): Promise<FlaskDocumentAiParseResponse> => {
  const bodyText = await response.text()
  let body: Record<string, unknown> = {}

  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as Record<string, unknown>
    } catch {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        describeInvalidFlaskResponse(response.status, bodyText)
      )
    }
  }

  if (!response.ok) {
    const detail =
      (typeof body.error === "string" && body.error) ||
      (typeof body.detail === "string" && body.detail) ||
      null
    const headline =
      (typeof body.message === "string" && body.message) ||
      `Document AI BFF request failed (${response.status})`
    const message =
      detail && !headline.includes(detail)
        ? `${headline}: ${detail}`
        : headline

    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }

  const job = (body.job ?? body) as FlaskDocumentAiJob

  if (!job?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Document AI BFF response is missing job.id"
    )
  }

  return { job }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const postDocumentAi = async (
  path: string,
  input: FlaskDocumentAiParseInput
): Promise<FlaskDocumentAiParseResponse> => {
  if (!isDocumentAiEnabled()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Document AI is disabled. Set DOCUMENT_AI_ENABLED=true and HYBRID_API_URL."
    )
  }

  const baseUrl = getHybridApiUrl()

  if (!baseUrl) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "HYBRID_API_URL is not configured"
    )
  }

  const payload = buildFlaskDocumentInput(input)
  const requestInit: RequestInit = {
    method: "POST",
    headers: buildHybridHeaders(),
    body: JSON.stringify(buildParsePayload(payload)),
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, requestInit)

      if (
        attempt === 0 &&
        RETRYABLE_BFF_STATUS.has(response.status)
      ) {
        await sleep(2000)
        continue
      }

      return await parseFlaskResponse(response)
    } catch (error) {
      lastError = error

      if (
        attempt === 0 &&
        error instanceof MedusaError &&
        error.type === MedusaError.Types.UNEXPECTED_STATE &&
        /일시적으로 응답하지 않습니다|HTML 오류 페이지/.test(error.message)
      ) {
        await sleep(2000)
        continue
      }

      const detail = error instanceof Error ? error.message : String(error)
      const isTimeout =
        (error instanceof Error && error.name === "AbortError") ||
        detail.toLowerCase().includes("abort")

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        isTimeout
          ? `Document AI BFF(Upstage) 요청이 ${getDocumentAiRequestTimeoutMs()}ms 내에 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.`
          : `Document AI BFF is unreachable at ${baseUrl}. Start services/document-ai-bff (python -m app.main) or set DOCUMENT_AI_ENABLED=false for stub mode. (${detail})`
      )
    }
  }

  if (lastError instanceof MedusaError) {
    throw lastError
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Document AI BFF(Upstage) request failed after retry."
  )
}

export const parseReceiptDocumentWithFlask = async (
  input: FlaskDocumentAiParseInput & {
    stored_document_url?: string | null
  }
): Promise<FlaskDocumentAiParseResponse> => {
  return postDocumentAi("/api/v1/document-ai/receipts/parse", input)
}

export const parseTrackingDocumentWithFlask = async (
  input: FlaskDocumentAiParseInput & {
    stored_document_url?: string | null
  }
): Promise<FlaskDocumentAiParseResponse> => {
  return postDocumentAi("/api/v1/document-ai/tracking/parse", input)
}

export const getDocumentAiJobFromFlask = async (
  jobId: string
): Promise<FlaskDocumentAiParseResponse> => {
  if (!isDocumentAiEnabled()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Document AI is disabled"
    )
  }

  const baseUrl = getHybridApiUrl()

  if (!baseUrl) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "HYBRID_API_URL is not configured"
    )
  }

  let response: Response

  try {
    response = await fetchWithTimeout(
      `${baseUrl}/api/v1/document-ai/jobs/${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: buildHybridHeaders(),
      }
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const isTimeout =
      (error instanceof Error && error.name === "AbortError") ||
      detail.toLowerCase().includes("abort")

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      isTimeout
        ? `Document AI BFF request timed out after ${getDocumentAiRequestTimeoutMs()}ms`
        : `Document AI BFF is unreachable at ${baseUrl}. Start services/document-ai-bff (python -m app.main). (${detail})`
    )
  }

  return parseFlaskResponse(response)
}
