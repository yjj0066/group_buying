import {
  GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES,
  formatDocumentUploadMaxSizeLabel,
} from "@lib/constants/group-deal-document-upload"

export const UPLOAD_SIZE_TOO_LARGE_MESSAGE =
  `업로드 용량이 서버 허용 한도를 초과했습니다. 공구 사진은 ${formatDocumentUploadMaxSizeLabel()} 이하(권장 1MB)로 줄인 뒤 다시 시도해 주세요.`

export const UPLOAD_STORAGE_QUOTA_MESSAGE =
  "브라우저 저장 공간 한도를 초과했습니다. 사진 크기를 줄이거나 사진을 제거한 뒤 다시 시도해 주세요."

const UPLOAD_SIZE_ERROR_PATTERNS = [
  /entity too large/i,
  /payload too large/i,
  /payloadtoolarge/i,
  /request body (?:is )?too large/i,
  /body exceeded/i,
  /413\b/,
  /document image must be/i,
  /파일 크기는 .+ 이하여야/i,
  /quotaexceeded/i,
  /exceeded the quota/i,
  /storage quota/i,
]

export const isUploadSizeRelatedError = (message: string): boolean =>
  UPLOAD_SIZE_ERROR_PATTERNS.some((pattern) => pattern.test(message))

export const formatUploadSizeErrorMessage = (
  message: string,
  status?: number
): string | null => {
  if (status === 413 || isUploadSizeRelatedError(message)) {
    if (/quotaexceeded|exceeded the quota|storage quota/i.test(message)) {
      return UPLOAD_STORAGE_QUOTA_MESSAGE
    }

    if (/파일 크기는 .+ 이하여야/i.test(message)) {
      return message.trim()
    }

    if (/document image must be/i.test(message)) {
      return `사진 크기는 ${formatDocumentUploadMaxSizeLabel(GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES)} 이하여야 합니다. 더 작은 사진을 사용해 주세요.`
    }

    return UPLOAD_SIZE_TOO_LARGE_MESSAGE
  }

  return null
}

/** Rough decoded byte size from a data URL (base64 payload). */
export const estimateDataUrlBytes = (dataUrl: string): number => {
  const commaIndex = dataUrl.indexOf(",")

  if (commaIndex < 0) {
    return dataUrl.length
  }

  const base64 = dataUrl.slice(commaIndex + 1).replace(/\s/g, "")
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0

  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export const assertDataUrlUploadSize = (
  dataUrl: string,
  maxBytes: number = GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES
): void => {
  const bytes = estimateDataUrlBytes(dataUrl)

  if (bytes > maxBytes) {
    throw new Error(
      `파일 크기는 ${formatDocumentUploadMaxSizeLabel(maxBytes)} 이하여야 합니다.`
    )
  }
}
