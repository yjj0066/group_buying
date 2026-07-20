"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { getGbAppSplashRedirect } from "@lib/data/gb-app-auth-flow"
import { useDictionary } from "@i18n/provider"

type GbAppSplashProps = {
  countryCode: string
}

const GbAppSplash = ({ countryCode }: GbAppSplashProps) => {
  const t = useDictionary()
  const router = useRouter()
  const auth = t.gbApp.auth

  useEffect(() => {
    let cancelled = false

    const redirect = async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))

      if (cancelled) {
        return
      }

      const destination = await getGbAppSplashRedirect(countryCode)
      router.replace(destination)
    }

    void redirect()

    return () => {
      cancelled = true
    }
  }, [countryCode, router])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8">
      <h1 className="text-2xl font-black tracking-tight bb-gradient-text">
        {auth.logo}
      </h1>

      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple/30 border-t-brand-purple"
        role="status"
        aria-label={auth.splashLoading}
      />
    </div>
  )
}

export default GbAppSplash
