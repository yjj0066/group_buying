/** Must match storefront GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES */
export const GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** Base64 JSON payloads are ~4/3 of raw file size; allow headroom for metadata. */
export const GROUP_DEAL_DOCUMENT_MAX_REQUEST_BODY_LIMIT = "32mb"

export const formatGroupDealDocumentMaxUploadLabel = (
  maxBytes: number = GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES
): string => `${Math.round(maxBytes / (1024 * 1024))}MB`
