import { FetchError } from "@medusajs/js-sdk"

type MedusaError = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
  status?: number
}

export default function medusaError(error: unknown): never {
  if (error instanceof FetchError) {
    const message = error.message || error.statusText || "Request failed"
    throw new Error(
      message.charAt(0).toUpperCase() + message.slice(1) +
        (message.endsWith(".") ? "" : ".")
    )
  }

  const err = error as MedusaError
  if (err.response) {
    const u = new URL(err.config?.url ?? "", err.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data

    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (err.request) {
    throw new Error("No response received: " + String(err.request))
  } else {
    const message = err.message ?? "Unknown error"
    if (message.includes("fetch failed")) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. apps/backend에서 pnpm dev가 실행 중인지 확인해 주세요. (http://localhost:9000)"
      )
    }

    throw new Error("Error setting up the request: " + message)
  }
}
