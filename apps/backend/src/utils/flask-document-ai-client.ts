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
        "Flask Document AI returned invalid JSON"
      )
    }
  }

  if (!response.ok) {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      `Flask Document AI request failed (${response.status})`

    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }

  const job = (body.job ?? body) as FlaskDocumentAiJob

  if (!job?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Flask Document AI response is missing job.id"
    )
  }

  return { job }
}

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

  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: "POST",
    headers: buildHybridHeaders(),
    body: JSON.stringify(buildParsePayload(input)),
  })

  return parseFlaskResponse(response)
}

export const parseReceiptDocumentWithFlask = async (
  input: FlaskDocumentAiParseInput
): Promise<FlaskDocumentAiParseResponse> => {
  return postDocumentAi("/api/v1/document-ai/receipts/parse", {
    ...input,
    input_url:
      input.input_url ??
      (input.input_base64?.startsWith("/static/")
        ? buildPublicStaticUrl(input.input_base64)
        : null),
  })
}

export const parseTrackingDocumentWithFlask = async (
  input: FlaskDocumentAiParseInput
): Promise<FlaskDocumentAiParseResponse> => {
  return postDocumentAi("/api/v1/document-ai/tracking/parse", {
    ...input,
    input_url:
      input.input_url ??
      (input.input_base64?.startsWith("/static/")
        ? buildPublicStaticUrl(input.input_base64)
        : null),
  })
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

  const response = await fetchWithTimeout(
    `${baseUrl}/api/v1/document-ai/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: buildHybridHeaders(),
    }
  )

  return parseFlaskResponse(response)
}
