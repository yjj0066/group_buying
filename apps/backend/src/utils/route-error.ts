import { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ZodError } from "zod"

export const resolveRouteErrorStatus = (error: unknown): number => {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    typeof (error as MedusaError).type === "string"
  ) {
    switch ((error as MedusaError).type) {
      case MedusaError.Types.NOT_ALLOWED:
      case MedusaError.Types.INVALID_DATA:
        return 400
      case MedusaError.Types.NOT_FOUND:
        return 404
      case MedusaError.Types.UNAUTHORIZED:
        return 401
      default:
        return 500
    }
  }

  return 500
}

export const isMedusaErrorLike = (
  error: unknown
): error is { type: string; message: string } => {
  if (error instanceof MedusaError) {
    return true
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error &&
    typeof (error as { type: unknown }).type === "string" &&
    typeof (error as { message: unknown }).message === "string"
  )
}

export const extractRouteErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join("\n")
  }

  if (isMedusaErrorLike(error)) {
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: unknown
      error?: unknown
      cause?: unknown
    }

    if (record.error) {
      const nested = extractRouteErrorMessage(record.error, "")

      if (nested) {
        return nested
      }
    }

    if (record.cause) {
      const nested = extractRouteErrorMessage(record.cause, "")

      if (nested) {
        return nested
      }
    }

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim()
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim()
  }

  return fallback
}

export const respondWithRouteError = (
  res: MedusaResponse,
  error: unknown,
  options?: {
    logLabel?: string
    fallbackMessage?: string
  }
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: extractRouteErrorMessage(error, "Invalid request"),
      type: MedusaError.Types.INVALID_DATA,
    })
    return
  }

  if (isMedusaErrorLike(error)) {
    res.status(resolveRouteErrorStatus(error)).json({
      message: error.message,
      type: error.type,
    })
    return
  }

  if (options?.logLabel) {
    console.error(`[${options.logLabel}]`, error)
  }

  res.status(500).json({
    message: extractRouteErrorMessage(
      error,
      options?.fallbackMessage ?? "Request failed on the server"
    ),
    type: "unexpected_error",
  })
}
