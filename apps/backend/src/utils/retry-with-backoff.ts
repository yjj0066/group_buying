import { MedusaError } from "@medusajs/framework/utils"

export type RetryWithBackoffOptions = {
  maxAttempts: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  isRetryable?: (error: unknown) => boolean
  onRetry?: (context: {
    attempt: number
    maxAttempts: number
    error: unknown
    delayMs: number
  }) => void
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const defaultIsRetryable = (error: unknown): boolean => {
  if (error instanceof MedusaError) {
    const retryableTypes = new Set([
      MedusaError.Types.UNEXPECTED_STATE,
      MedusaError.Types.DB_ERROR,
    ])

    return retryableTypes.has(error.type)
  }

  if (error && typeof error === "object") {
    const statusCode = (error as { statusCode?: number }).statusCode
    const code = (error as { code?: string }).code

    if (statusCode && statusCode >= 500) {
      return true
    }

    if (
      code &&
      ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN"].includes(code)
    ) {
      return true
    }
  }

  return true
}

export const retryWithBackoff = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryWithBackoffOptions
): Promise<T> => {
  const maxAttempts = Math.max(1, options.maxAttempts)
  const initialDelayMs = options.initialDelayMs ?? 500
  const maxDelayMs = options.maxDelayMs ?? 8_000
  const backoffMultiplier = options.backoffMultiplier ?? 2
  const isRetryable = options.isRetryable ?? defaultIsRetryable

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error

      if (attempt >= maxAttempts || !isRetryable(error)) {
        break
      }

      const delayMs = Math.min(
        maxDelayMs,
        Math.round(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1))
      )

      options.onRetry?.({
        attempt,
        maxAttempts,
        error,
        delayMs,
      })

      await sleep(delayMs)
    }
  }

  throw lastError
}

export const isPgCaptureRetryableError = (error: unknown): boolean => {
  if (error instanceof MedusaError) {
    return (
      error.type === MedusaError.Types.UNEXPECTED_STATE ||
      error.type === MedusaError.Types.DB_ERROR
    )
  }

  if (error && typeof error === "object") {
    const statusCode = (error as { statusCode?: number }).statusCode

    if (statusCode === 429 || (statusCode && statusCode >= 500)) {
      return true
    }

    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return false
    }
  }

  return defaultIsRetryable(error)
}
