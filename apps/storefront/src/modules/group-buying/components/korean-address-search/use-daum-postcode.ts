"use client"

export type DaumPostcodeResult = {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName?: string
  apartment?: string
  userSelectedType?: "R" | "J"
}

type DaumPostcodeSize = {
  width: number
  height: number
}

type DaumPostcodeOptions = {
  oncomplete: (data: DaumPostcodeResult) => void
  onclose?: (state: string) => void
  onresize?: (size: DaumPostcodeSize) => void
  width?: string | number
  height?: string | number
  focusInput?: boolean
  maxSuggestItems?: number
}

type DaumPostcodeConstructor = new (options: DaumPostcodeOptions) => {
  open: () => void
  embed: (element: HTMLElement) => void
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor
    }
    kakao?: {
      Postcode: DaumPostcodeConstructor
    }
  }
}

const DAUM_POSTCODE_SCRIPT =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

export const DAUM_POSTCODE_MIN_HEIGHT = 500
export const DAUM_POSTCODE_EMBED_MIN_HEIGHT = 400

let scriptPromise: Promise<void> | null = null

export const getDaumPostcodeConstructor = (): DaumPostcodeConstructor | null => {
  return window.kakao?.Postcode ?? window.daum?.Postcode ?? null
}

export const getDaumPostcodeEmbedMaxHeight = () => {
  const viewportHeight =
    window.visualViewport?.height ?? window.innerHeight

  return Math.floor(viewportHeight * 0.85)
}

export const applyDaumPostcodeEmbedHeight = (
  element: HTMLElement,
  size: DaumPostcodeSize
) => {
  const maxHeight = getDaumPostcodeEmbedMaxHeight()
  const nextHeight = Math.min(
    Math.max(size.height, DAUM_POSTCODE_EMBED_MIN_HEIGHT),
    maxHeight
  )

  element.style.height = `${nextHeight}px`
}

export const createDaumPostcodeEmbedOptions = ({
  onComplete,
  onClose,
  onResize,
}: {
  onComplete: (data: DaumPostcodeResult) => void
  onClose?: () => void
  onResize?: (size: DaumPostcodeSize) => void
}): DaumPostcodeOptions => ({
  oncomplete: onComplete,
  onclose: onClose,
  onresize: onResize,
  width: "100%",
  height: "100%",
  focusInput: true,
  maxSuggestItems: 5,
})

export const loadDaumPostcodeScript = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Daum Postcode is only available in the browser"))
  }

  if (getDaumPostcodeConstructor()) {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="postcode/prod/postcode.v2.js"]'
    )

    if (existing) {
      if (getDaumPostcodeConstructor()) {
        resolve()
        return
      }

      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Daum Postcode")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = DAUM_POSTCODE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Daum Postcode"))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export const formatDaumPostcodeAddress = (data: DaumPostcodeResult) => {
  const base =
    data.userSelectedType === "J"
      ? data.jibunAddress
      : data.roadAddress || data.jibunAddress

  if (data.buildingName) {
    return `${base} ${data.buildingName}`.trim()
  }

  return base.trim()
}

export const openDaumPostcodeSearch = async (
  onComplete: (result: DaumPostcodeResult) => void
) => {
  await loadDaumPostcodeScript()

  const Postcode = getDaumPostcodeConstructor()

  if (!Postcode) {
    throw new Error("Daum Postcode is unavailable")
  }

  if (typeof document === "undefined") {
    throw new Error("Daum Postcode is only available in the browser")
  }

  return new Promise<void>((resolve, reject) => {
    const overlay = document.createElement("div")
    overlay.className =
      "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"

    const panel = document.createElement("div")
    panel.className =
      "flex max-h-[85dvh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white shadow-xl"

    const header = document.createElement("div")
    header.className =
      "flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3"

    const title = document.createElement("p")
    title.className = "text-sm font-bold text-[#111827]"
    title.textContent = "주소 검색"

    const closeButton = document.createElement("button")
    closeButton.type = "button"
    closeButton.className =
      "text-sm font-medium text-[#6B7280] hover:text-[#111827]"
    closeButton.textContent = "닫기"

    const embedContainer = document.createElement("div")
    embedContainer.className = "w-full shrink-0"
    embedContainer.style.height = `${DAUM_POSTCODE_MIN_HEIGHT}px`

    header.append(title, closeButton)
    panel.append(header, embedContainer)
    overlay.append(panel)
    document.body.append(overlay)

    const cleanup = () => {
      overlay.remove()
      resolve()
    }

    closeButton.addEventListener("click", cleanup)
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup()
      }
    })

    panel.addEventListener("click", (event) => {
      event.stopPropagation()
    })

    try {
      new Postcode(
        createDaumPostcodeEmbedOptions({
          onComplete: (data) => {
            onComplete(data)
            cleanup()
          },
          onClose: cleanup,
          onResize: (size) => {
            applyDaumPostcodeEmbedHeight(embedContainer, size)
          },
        })
      ).embed(embedContainer)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
