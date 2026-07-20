"use client"

import { useState } from "react"

import { useDictionary } from "@i18n/provider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Input, Label, Text } from "@modules/common/components/ui"

const ForgotPasswordForm = () => {
  const t = useDictionary()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!email.trim()) {
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="text-large-semi mb-4">{t.account.forgotPassword.title}</h1>
        <Text className="text-ui-fg-subtle">
          {t.account.forgotPassword.success.replace("{email}", email.trim())}
        </Text>
        <LocalizedClientLink href="/account" className="mt-6 underline text-sm">
          {t.account.forgotPassword.backToLogin}
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <h1 className="text-large-semi mb-4">{t.account.forgotPassword.title}</h1>
      <Text className="mb-8 text-center text-base-regular text-ui-fg-base">
        {t.account.forgotPassword.description}
      </Text>

      <form className="w-full" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="forgot-email">{t.account.register.email}</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="mt-6 w-full">
          {t.account.forgotPassword.submit}
        </Button>
      </form>

      <LocalizedClientLink href="/account" className="mt-6 text-sm underline">
        {t.account.forgotPassword.backToLogin}
      </LocalizedClientLink>
    </div>
  )
}

export default ForgotPasswordForm
