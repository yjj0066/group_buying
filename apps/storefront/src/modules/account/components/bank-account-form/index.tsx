"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { saveBankAccount } from "@lib/data/account-group-deals"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
import type { RefundBankAccount } from "types/account-group-deals"

type BankAccountFormProps = {
  initialAccount: RefundBankAccount | null
  isOnboarding?: boolean
}

const BankAccountForm = ({
  initialAccount,
  isOnboarding = false,
}: BankAccountFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [savedAccount, setSavedAccount] = useState(initialAccount)
  const [bankCode, setBankCode] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!bankCode.trim() || !bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError(t.account.bankAccount.requiredFields)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const account = await saveBankAccount({
        bank_code: bankCode.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
      })

      setSavedAccount(account)
      setAccountNumber("")
      setSuccess(true)

      if (isOnboarding) {
        router.push(`/${countryCode}`)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.bankAccount.saveError
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      {savedAccount && (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
          <Text className="text-sm font-semibold text-emerald-900">
            {t.account.bankAccount.savedTitle}
          </Text>
          <dl className="mt-3 grid gap-2 text-sm text-emerald-800">
            <div>
              <dt className="text-emerald-700">{t.account.bankAccount.bankNameLabel}</dt>
              <dd className="font-medium">{savedAccount.bank_name}</dd>
            </div>
            <div>
              <dt className="text-emerald-700">{t.account.bankAccount.accountNumberLabel}</dt>
              <dd className="font-mono font-medium">
                {savedAccount.account_number_masked}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-700">{t.account.bankAccount.accountHolderLabel}</dt>
              <dd className="font-medium">{savedAccount.account_holder}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.account.bankAccount.formTitle}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {t.account.bankAccount.formDescription}
        </Text>

        <div className="mt-4 grid gap-4 medium:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="bank-code">{t.account.bankAccount.bankCodeLabel}</Label>
            <Input
              id="bank-code"
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              placeholder={t.account.bankAccount.bankCodePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="bank-name">{t.account.bankAccount.bankNameLabel}</Label>
            <Input
              id="bank-name"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder={t.account.bankAccount.bankNamePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="account-number">
              {t.account.bankAccount.accountNumberLabel}
            </Label>
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder={t.account.bankAccount.accountNumberPlaceholder}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="account-holder">
              {t.account.bankAccount.accountHolderLabel}
            </Label>
            <Input
              id="account-holder"
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              placeholder={t.account.bankAccount.accountHolderPlaceholder}
            />
          </div>
        </div>
      </section>

      {error && <Text className="text-sm text-red-600">{error}</Text>}
      {success && (
        <Text className="text-sm text-emerald-700">
          {t.account.bankAccount.saveSuccess}
        </Text>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? t.account.bankAccount.saving : t.account.bankAccount.saveButton}
      </Button>
    </div>
  )
}

export default BankAccountForm
