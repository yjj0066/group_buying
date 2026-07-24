import { estimateDataUrlBytes } from "@lib/util/upload-size-error"

/** Keep cover uploads safely under Vercel's ~4.5MB request body limit (base64 expands ~33%). */
export const GROUP_DEAL_COVER_UPLOAD_TARGET_BYTES = 400 * 1024
export const GROUP_DEAL_COVER_MAX_DIMENSION = 1024
/** Hard cap before calling any Next.js upload endpoint. */
export const GROUP_DEAL_COVER_UPLOAD_SAFE_MAX_BYTES = 1200 * 1024

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."))
    image.src = dataUrl
  })

const canvasToJpegDataUrl = (
  canvas: HTMLCanvasElement,
  quality: number
): string => canvas.toDataURL("image/jpeg", quality)

/**
 * Downscale/re-encode a data URL for cover upload.
 * No-ops on the server (returns input) — compression runs in the browser only.
 */
export const compressImageDataUrlForCoverUpload = async (
  dataUrl: string,
  options?: {
    maxBytes?: number
    maxDimension?: number
  }
): Promise<string> => {
  if (typeof window === "undefined") {
    return dataUrl
  }

  const maxBytes = options?.maxBytes ?? GROUP_DEAL_COVER_UPLOAD_TARGET_BYTES
  const maxDimension = options?.maxDimension ?? GROUP_DEAL_COVER_MAX_DIMENSION

  if (estimateDataUrlBytes(dataUrl) <= maxBytes) {
    return dataUrl
  }

  const image = await loadImage(dataUrl)
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height, 1)
  )
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")

  if (!context) {
    return dataUrl
  }

  context.drawImage(image, 0, 0, width, height)

  let quality = 0.85
  let compressed = canvasToJpegDataUrl(canvas, quality)

  while (estimateDataUrlBytes(compressed) > maxBytes && quality > 0.45) {
    quality -= 0.1
    compressed = canvasToJpegDataUrl(canvas, quality)
  }

  if (estimateDataUrlBytes(compressed) > maxBytes) {
    const shrink = Math.sqrt(maxBytes / estimateDataUrlBytes(compressed))
    canvas.width = Math.max(1, Math.round(width * shrink))
    canvas.height = Math.max(1, Math.round(height * shrink))
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    compressed = canvasToJpegDataUrl(canvas, 0.7)
  }

  return compressed
}
