"use client"

import { useActionState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import { useDictionary } from "@i18n/provider"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [message, formAction] = useActionState(signup, null)

  useEffect(() => {
    if (message?.state === "success") {
      router.refresh()
      router.push(`/${countryCode}/account`)
    }
  }, [message?.state, countryCode, router])

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        {t.account.register.title}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t.account.register.subtitle}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="register-verification-message"
        >
          {t.account.register.verificationIntro}{" "}
          <strong>{message.email}</strong>
          {t.account.register.verificationOutro}
        </div>
      )}
      {message?.state === "success" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="register-success-message"
        >
          {t.account.register.successRedirecting}
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t.account.register.firstName}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={t.account.register.lastName}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t.account.register.email}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t.account.register.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t.account.register.password}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          {t.account.register.agreementPrefix}{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            {t.account.register.privacyPolicy}
          </LocalizedClientLink>{" "}
          {t.account.register.agreementMiddle}{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            {t.account.register.termsOfUse}
          </LocalizedClientLink>
          {t.account.register.agreementSuffix}
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {t.account.register.submit}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t.account.register.alreadyMember}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t.account.register.signIn}
        </button>
        .
      </span>
    </div>
  )
}

export default Register
