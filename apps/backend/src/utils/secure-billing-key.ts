import crypto from "crypto"
import { MedusaError } from "@medusajs/framework/utils"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const deriveKey = (secret: string): Buffer => {
  return crypto.createHash("sha256").update(secret).digest()
}

export const resolveBillingKeyEncryptionSecret = (): string => {
  const secret =
    process.env.BILLING_KEY_ENCRYPTION_SECRET || process.env.COOKIE_SECRET

  if (!secret?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "BILLING_KEY_ENCRYPTION_SECRET or COOKIE_SECRET is required to store billing keys"
    )
  }

  return secret
}

/**
 * 빌링키를 AES-256-GCM으로 암호화합니다.
 * DB에는 암호문만 저장하고 평문은 로그/응답에 노출하지 않습니다.
 */
export const encryptBillingKey = (
  plainBillingKey: string,
  secret: string = resolveBillingKeyEncryptionSecret()
): string => {
  if (!plainBillingKey?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Billing key is required"
    )
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(secret), iv)
  const encrypted = Buffer.concat([
    cipher.update(plainBillingKey, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export const decryptBillingKey = (
  encryptedBillingKey: string,
  secret: string = resolveBillingKeyEncryptionSecret()
): string => {
  if (!encryptedBillingKey?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Encrypted billing key is missing"
    )
  }

  const payload = Buffer.from(encryptedBillingKey, "base64")

  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Encrypted billing key payload is invalid"
    )
  }

  const iv = payload.subarray(0, IV_LENGTH)
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(secret), iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}
