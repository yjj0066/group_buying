"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"

type Props = {
  setCurrentView?: (view: string) => void
}

const Register = (_props: Props) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  useEffect(() => {
    router.replace(`/${countryCode}/auth/signup`)
  }, [countryCode, router])

  return (
    <div
      className="flex w-full max-w-sm flex-col items-center py-8"
      data-testid="register-page"
    >
      <p className="text-center text-base-regular text-ui-fg-base">
        {t.account.register.successRedirecting}
      </p>
    </div>
  )
}

export default Register
