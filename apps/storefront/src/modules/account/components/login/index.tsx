"use client"

import { useActionState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { login } from "@lib/data/customer"
import { resolvePostLoginRedirect } from "@lib/data/gb-app-auth-flow"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useDictionary } from "@i18n/provider"
import SocialLoginButtons from "@modules/account/components/social-login-buttons"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [message, formAction] = useActionState(login, null)

  useEffect(() => {
    if (message?.state !== "success") {
      return
    }

    void resolvePostLoginRedirect(countryCode).then((destination) => {
      router.replace(destination)
      router.refresh()
    })
  }, [message?.state, countryCode, router])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="text-large-semi uppercase mb-6">{t.account.login.title}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {t.account.login.subtitle}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="login-verification-message"
        >
          {t.account.login.verificationIntro}{" "}
          <strong>{message.email}</strong>
          {t.account.login.verificationOutro}
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t.account.register.email}
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t.account.register.password}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <SubmitButton
          data-testid="sign-in-button"
          variant="primary"
          className="mt-6 h-12 w-full rounded-full font-bold"
        >
          {t.account.login.submit}
        </SubmitButton>
      </form>

      <SocialLoginButtons />

      <LocalizedClientLink
        href="/account/forgot-password"
        className="mt-4 text-sm text-ui-fg-subtle underline"
      >
        {t.account.login.forgotPassword}
      </LocalizedClientLink>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t.account.login.notMember}{" "}
        <LocalizedClientLink href="/auth/signup" className="underline">
          {t.account.login.joinUs}
        </LocalizedClientLink>
        .
      </span>
    </div>
  )
}

export default Login
