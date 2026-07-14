import crypto from "crypto"
import { timingSafeEqual } from "crypto"

const safeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)

  if (bufferA.length !== bufferB.length) {
    return false
  }

  return timingSafeEqual(bufferA, bufferB)
}

/**
 * 토스페이먼츠 웹훅 서명 검증
 *
 * message = `{timestamp}.{rawBody}`
 * signature = Base64(HMAC-SHA256(webhookSecret, message))
 */
export const verifyTossWebhookSignature = (input: {
  rawBody: string | Buffer
  signature: string
  secret: string
  timestamp?: string
}): boolean => {
  const body =
    typeof input.rawBody === "string"
      ? input.rawBody
      : input.rawBody.toString("utf8")

  if (!input.signature?.trim() || !input.secret?.trim()) {
    return false
  }

  const message = input.timestamp ? `${input.timestamp}.${body}` : body
  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(message)
    .digest("base64")

  return safeCompare(expected, input.signature.trim())
}

/**
 * 포트원(아임포트) 웹훅 서명 검증
 *
 * imp_signature = sha256(imp_uid + api_secret + status)
 */
export const verifyPortoneWebhookSignature = (input: {
  impUid: string
  status: string
  signature: string
  secret: string
}): boolean => {
  if (
    !input.impUid?.trim() ||
    !input.status?.trim() ||
    !input.signature?.trim() ||
    !input.secret?.trim()
  ) {
    return false
  }

  const expected = crypto
    .createHash("sha256")
    .update(`${input.impUid}${input.secret}${input.status}`)
    .digest("hex")

  return safeCompare(expected, input.signature.trim())
}

export const createTestWebhookSignature = (
  rawBody: string,
  secret: string
): string => {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64")
}
