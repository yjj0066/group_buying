"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { getGbAppSplashRedirect } from "@lib/data/gb-app-auth-flow"
import { PokaCatchLogo } from "@modules/common/components/pokacatch-logo"
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
      <PokaCatchLogo
        variant="light"
        wordmark={auth.logo}
        iconSize={48}
        wordmarkClassName="text-2xl"
      />

      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple/30 border-t-brand-purple"
        role="status"
        aria-label={auth.splashLoading}
      />
    </div>
  )
}

export default GbAppSplash
