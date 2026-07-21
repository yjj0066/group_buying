"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type UseSoftRouterRefreshOptions = {
  minHiddenMs?: number
  minRefreshIntervalMs?: number
}

export const useSoftRouterRefresh = ({
  minHiddenMs = 3000,
  minRefreshIntervalMs = 15000,
}: UseSoftRouterRefreshOptions = {}) => {
  const router = useRouter()
  const hiddenAtRef = useRef<number | null>(null)
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now()
        return
      }

      if (document.visibilityState !== "visible") {
        return
      }

      const hiddenAt = hiddenAtRef.current
      hiddenAtRef.current = null

      if (!hiddenAt) {
        return
      }

      const hiddenDuration = Date.now() - hiddenAt

      if (hiddenDuration < minHiddenMs) {
        return
      }

      const sinceLastRefresh = Date.now() - lastRefreshRef.current

      if (sinceLastRefresh < minRefreshIntervalMs) {
        return
      }

      lastRefreshRef.current = Date.now()
      router.refresh()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router, minHiddenMs, minRefreshIntervalMs])
}

export default useSoftRouterRefresh
