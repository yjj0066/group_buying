"use client"

import { useEffect, useRef } from "react"

import {
  type DaumPostcodeResult,
  applyDaumPostcodeEmbedHeight,
  createDaumPostcodeEmbedOptions,
  DAUM_POSTCODE_MIN_HEIGHT,
  getDaumPostcodeConstructor,
  loadDaumPostcodeScript,
} from "./use-daum-postcode"

type DaumPostcodeModalProps = {
  open: boolean
  onClose: () => void
  onComplete: (result: DaumPostcodeResult) => void
}

const DaumPostcodeModal = ({
  open,
  onClose,
  onComplete,
}: DaumPostcodeModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastEmbedSizeRef = useRef<{ width: number; height: number } | null>(null)
  const onCloseRef = useRef(onClose)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCloseRef.current = onClose
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    if (!open || !containerRef.current) {
      return
    }

    const container = containerRef.current
    let cancelled = false
    let ignoreClose = false

    lastEmbedSizeRef.current = null
    container.style.height = `${DAUM_POSTCODE_MIN_HEIGHT}px`

    const syncEmbedHeight = () => {
      if (lastEmbedSizeRef.current) {
        applyDaumPostcodeEmbedHeight(container, lastEmbedSizeRef.current)
      }
    }

    window.visualViewport?.addEventListener("resize", syncEmbedHeight)
    window.visualViewport?.addEventListener("scroll", syncEmbedHeight)

    loadDaumPostcodeScript()
      .then(() => {
        const Postcode = getDaumPostcodeConstructor()

        if (cancelled || !Postcode) {
          onCloseRef.current()
          return
        }

        container.innerHTML = ""

        new Postcode(
          createDaumPostcodeEmbedOptions({
            onComplete: (data) => {
              onCompleteRef.current(data)
              onCloseRef.current()
            },
            onClose: () => {
              if (ignoreClose) {
                return
              }
              onCloseRef.current()
            },
            onResize: (size) => {
              lastEmbedSizeRef.current = size
              applyDaumPostcodeEmbedHeight(container, size)
            },
          })
        ).embed(container)
      })
      .catch(() => {
        if (!cancelled) {
          onCloseRef.current()
        }
      })

    return () => {
      cancelled = true
      ignoreClose = true
      window.visualViewport?.removeEventListener("resize", syncEmbedHeight)
      window.visualViewport?.removeEventListener("scroll", syncEmbedHeight)
      container.innerHTML = ""
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="주소 검색"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-sm font-bold text-[#111827]">주소 검색</p>
          <button
            type="button"
            className="text-sm font-medium text-[#6B7280] hover:text-[#111827]"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div
          ref={containerRef}
          className="w-full shrink-0"
          style={{ height: `${DAUM_POSTCODE_MIN_HEIGHT}px` }}
        />
      </div>
    </div>
  )
}

export default DaumPostcodeModal
