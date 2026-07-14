type FetchOptions = {
  method?: string
  body?: unknown
}

export const adminFetch = async <T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> => {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const payload = await response.json()
      message = payload.message ?? payload.error ?? message
    } catch {
      // ignore parse errors
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
