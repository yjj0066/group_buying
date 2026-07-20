"use client"

import { useState } from "react"

import { useDictionary } from "@i18n/provider"

const SocialLoginButtons = () => {
  const t = useDictionary()
  const auth = t.gbApp.auth
  const [notice, setNotice] = useState<string | null>(null)

  const handleClick = () => {
    setNotice(auth.socialLoginComingSoon)
  }

  return (
    <div className="mt-6 flex w-full flex-col gap-3">
      <div className="h-px w-full bg-ui-border-base" />

      {notice && (
        <p
          className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle px-3 py-2 text-center text-small-regular text-ui-fg-base"
          data-testid="social-login-notice"
        >
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={handleClick}
        className="flex h-11 w-full items-center justify-center rounded-full border border-ui-border-base bg-ui-bg-base text-small-regular font-medium text-ui-fg-base transition-colors hover:bg-ui-bg-subtle"
        data-testid="kakao-login-button"
      >
        {auth.kakaoContinue}
      </button>
      <button
        type="button"
        onClick={handleClick}
        className="flex h-11 w-full items-center justify-center rounded-full border border-ui-border-base bg-ui-bg-base text-small-regular font-medium text-ui-fg-base transition-colors hover:bg-ui-bg-subtle"
        data-testid="apple-login-button"
      >
        {auth.appleContinue}
      </button>
    </div>
  )
}

export default SocialLoginButtons
