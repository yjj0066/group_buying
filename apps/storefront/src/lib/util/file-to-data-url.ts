import {
  GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES,
  formatDocumentUploadMaxSizeLabel,
} from "@lib/constants/group-deal-document-upload"

export { GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES, formatDocumentUploadMaxSizeLabel }

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read file"))
        return
      }

      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })

export const assertDocumentUploadSize = (
  file: File,
  maxBytes: number = GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES
) => {
  if (file.size > maxBytes) {
    throw new Error(
      `파일 크기는 ${formatDocumentUploadMaxSizeLabel(maxBytes)} 이하여야 합니다.`
    )
  }
}
