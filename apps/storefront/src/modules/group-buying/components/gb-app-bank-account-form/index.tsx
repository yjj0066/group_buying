"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  resolvePostLoginRedirect,
  saveGbAppBankAccount,
} from "@lib/data/gb-app-auth-flow"
import { KOREAN_BANK_OPTIONS } from "@lib/constants/korean-banks"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { useDictionary } from "@i18n/provider"
import { BbAlert, BbButton } from "@modules/design-system"

type GbAppBankAccountFormProps = {
  countryCode: string
  expectedAccountHolder?: string | null
}

const normalizeAccountHolderName = (value: string) =>
  value.trim().replace(/\s+/g, "").toLowerCase()

const GbAppBankAccountForm = ({
  countryCode,
  expectedAccountHolder = "",
}: GbAppBankAccountFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const auth = t.gbApp.auth
  const bank = t.account.bankAccount
  const [bankCode, setBankCode] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [message, formAction, isPending] = useActionState(saveGbAppBankAccount, null)

  const normalizedExpectedHolder = useMemo(
    () => normalizeAccountHolderName(expectedAccountHolder ?? ""),
    [expectedAccountHolder]
  )

  useEffect(() => {
    if (message?.state !== "success") {
      return
    }

    void resolvePostLoginRedirect(countryCode).then((destination) => {
      router.refresh()
      router.replace(destination)
    })
  }, [message?.state, countryCode, router])

  const handleSkip = () => {
    router.replace(gbAppRoutes.home(countryCode))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setLocalError(null)

    if (
      normalizedExpectedHolder &&
      normalizeAccountHolderName(accountHolder) !== normalizedExpectedHolder
    ) {
      event.preventDefault()
      setLocalError(auth.bankHolderMismatchError)
      return
    }
  }

  const resolvedError =
    localError ??
    (message?.state === "error"
      ? message.error === "required_fields"
        ? bank.requiredFields
        : message.error === "account_holder_mismatch"
          ? auth.bankHolderMismatchError
          : message.error === "unauthorized"
            ? auth.bankSaveError
            : auth.bankSaveError
      : null)

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-black text-[var(--bb-ink)]">
          {auth.bankTitle}
        </h1>
        <BbAlert variant="info">{auth.bankInfo}</BbAlert>
      </div>

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="bank_name" value={bankName} />

        <select
          name="bank_code"
          required
          value={bankCode}
          className="bb-input w-full"
          data-testid="bank-account-bank-select"
          onChange={(event) => {
            const code = event.target.value
            const selected = KOREAN_BANK_OPTIONS.find((option) => option.code === code)

            setBankCode(code)
            setBankName(selected?.name ?? "")
          }}
        >
          <option value="" disabled>
            {auth.bankSelectPlaceholder}
          </option>
          {KOREAN_BANK_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>

        <input
          name="account_number"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          inputMode="numeric"
          required
          placeholder={bank.accountNumberPlaceholder}
          className="bb-input w-full"
          data-testid="bank-account-number-input"
        />
        <input
          name="account_holder"
          value={accountHolder}
          onChange={(event) => setAccountHolder(event.target.value)}
          required
          placeholder={bank.accountHolderPlaceholder}
          className="bb-input w-full"
          data-testid="bank-account-holder-input"
        />

        <BbButton
          type="submit"
          fullWidth
          isLoading={isPending}
          className="mt-1"
          data-testid="bank-account-submit-button"
        >
          {auth.bankSubmit}
        </BbButton>

        {resolvedError && (
          <BbAlert variant="error" data-testid="bank-account-error">
            {resolvedError}
          </BbAlert>
        )}
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-[var(--bb-mute)] underline underline-offset-2 hover:text-brand-purple"
          data-testid="bank-account-skip-button"
        >
          {auth.bankSkip}
        </button>
      </div>
    </div>
  )
}

export default GbAppBankAccountForm
