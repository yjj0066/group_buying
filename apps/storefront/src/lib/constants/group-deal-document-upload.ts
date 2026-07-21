/** Long mobile scroll captures can exceed 8MB; keep client/server limits aligned. */
export const GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export const formatDocumentUploadMaxSizeLabel = (
  maxBytes: number = GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES
): string => `${Math.round(maxBytes / (1024 * 1024))}MB`
