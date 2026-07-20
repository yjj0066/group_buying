import { FetchError } from "@medusajs/js-sdk"

import { sdk } from "./sdk"

type FetchOptions = {
  method?: string
  body?: unknown
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof FetchError) {
    if (error.message?.trim()) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export const adminFetch = async <T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> => {
  try {
    return await sdk.client.fetch<T>(path, {
      method: options.method ?? "GET",
      body: options.body,
    })
  } catch (error) {
    const fallback =
      error instanceof FetchError && error.status === 401
        ? "Unauthorized — Admin에 다시 로그인해 주세요."
        : `Request failed${
            error instanceof FetchError && error.status
              ? ` (${error.status})`
              : ""
          }`

    throw new Error(getErrorMessage(error, fallback))
  }
}

export const adminDownload = async (path: string, filename: string) => {
  try {
    const response = await sdk.client.fetch<Response>(path, {
      method: "GET",
      headers: { accept: "text/csv" },
    })

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    const fallback = `Download failed${
      error instanceof FetchError && error.status ? ` (${error.status})` : ""
    }`

    throw new Error(getErrorMessage(error, fallback))
  }
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export const fileToBase64DataUrl = readFileAsDataUrl
