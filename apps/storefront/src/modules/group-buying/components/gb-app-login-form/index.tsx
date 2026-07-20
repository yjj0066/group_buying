"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { login } from "@lib/data/customer"
import { resolvePostLoginRedirect } from "@lib/data/gb-app-auth-flow"
import { useDictionary } from "@i18n/provider"
import { BbAlert, BbButton } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type GbAppLoginFormProps = {
  countryCode: string
}

const GbAppLoginForm = ({ countryCode }: GbAppLoginFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const auth = t.gbApp.auth
  const [message, formAction, isPending] = useActionState(login, null)
  const [socialNotice, setSocialNotice] = useState<string | null>(null)

  useEffect(() => {
    if (message?.state !== "success") {
      return
    }

    void resolvePostLoginRedirect(countryCode).then((destination) => {
      router.refresh()
      router.replace(destination)
    })
  }, [message?.state, countryCode, router])

  const handleSocialLogin = () => {
    setSocialNotice(auth.socialLoginComingSoon)
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-4">
      <h1 className="text-center text-2xl font-black tracking-tight bb-gradient-text">
        {auth.logo}
      </h1>

      {message?.state === "verification_required" && (
        <BbAlert variant="info">
          {t.account.login.verificationIntro}{" "}
          <strong>{message.email}</strong>
          {t.account.login.verificationOutro}
        </BbAlert>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={auth.emailPlaceholder}
          className="bb-input w-full"
          data-testid="email-input"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={auth.passwordPlaceholder}
          className="bb-input w-full"
          data-testid="password-input"
        />

        <BbButton type="submit" fullWidth isLoading={isPending} className="mt-1">
          {auth.loginSubmit}
        </BbButton>

        {message?.state === "error" && (
          <BbAlert variant="error">{auth.loginError}</BbAlert>
        )}
      </form>

      <div className="h-px bg-[var(--bb-line)]" />

      <div className="flex flex-col gap-2">
        {socialNotice && <BbAlert variant="info">{socialNotice}</BbAlert>}

        <BbButton
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleSocialLogin}
          data-testid="kakao-login-button"
        >
          {auth.kakaoContinue}
        </BbButton>
        <BbButton
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleSocialLogin}
          data-testid="apple-login-button"
        >
          {auth.appleContinue}
        </BbButton>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs font-medium text-[var(--bb-mute)]">
        <LocalizedClientLink
          href="/account/forgot-password"
          className="underline underline-offset-2 hover:text-brand-purple"
        >
          {auth.forgotPassword}
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/auth/signup"
          className="underline underline-offset-2 hover:text-brand-purple"
        >
          {auth.signupLink}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default GbAppLoginForm
