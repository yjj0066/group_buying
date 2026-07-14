"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@modules/common/components/ui"
import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = () => {
  const t = useDictionary()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  const confirmed = useRef(false)

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
      data-testid="verify-account-page"
    >
      <h1 className="text-large-semi uppercase">{t.account.verify.title}</h1>

      {state === "verifying" && (
        <p className="text-base-regular text-ui-fg-base">
          {t.account.verify.verifying}
        </p>
      )}

      {state === "success" && (
        <>
          <p className="text-base-regular text-ui-fg-base">
            {t.account.verify.success}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="primary">{t.account.verify.successCta}</Button>
          </LocalizedClientLink>
        </>
      )}

      {state === "error" && (
        <>
          <p className="text-base-regular text-ui-fg-base">
            {t.account.verify.error}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="secondary">{t.account.verify.errorCta}</Button>
          </LocalizedClientLink>
        </>
      )}
    </div>
  )
}

export default VerifyAccount
