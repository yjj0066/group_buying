"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { saveBankAccount } from "@lib/data/account-group-deals"
import { KOREAN_BANK_OPTIONS } from "@lib/constants/korean-banks"
import { useDictionary } from "@i18n/provider"
import { BbAlert, BbButton } from "@modules/design-system"

type MyBankAccountEditFormProps = {
  onCancel?: () => void
  onSaved?: () => void
}

const MyBankAccountEditForm = ({
  onCancel,
  onSaved,
}: MyBankAccountEditFormProps) => {
  const t = useDictionary()
  const bank = t.account.bankAccount
  const router = useRouter()
  const [bankCode, setBankCode] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const resolvedBankName =
      bankName.trim() ||
      KOREAN_BANK_OPTIONS.find((option) => option.code === bankCode)?.name ||
      ""

    if (
      !bankCode.trim() ||
      !resolvedBankName ||
      !accountNumber.trim() ||
      !accountHolder.trim()
    ) {
      setError(bank.requiredFields)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await saveBankAccount({
        bank_code: bankCode.trim(),
        bank_name: resolvedBankName,
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
      })

      router.refresh()
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : bank.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={bankCode}
        required
        className="bb-input w-full"
        onChange={(event) => {
          const code = event.target.value
          const selected = KOREAN_BANK_OPTIONS.find((option) => option.code === code)

          setBankCode(code)
          setBankName(selected?.name ?? "")
        }}
      >
        <option value="" disabled>
          {bank.bankSelectPlaceholder}
        </option>
        {KOREAN_BANK_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>

      <input
        value={accountNumber}
        onChange={(event) => setAccountNumber(event.target.value)}
        inputMode="numeric"
        placeholder={bank.accountNumberPlaceholder}
        className="bb-input w-full"
      />
      <input
        value={accountHolder}
        onChange={(event) => setAccountHolder(event.target.value)}
        placeholder={bank.accountHolderPlaceholder}
        className="bb-input w-full"
      />

      {error && <BbAlert variant="error">{error}</BbAlert>}

      <BbButton type="button" fullWidth isLoading={saving} onClick={handleSave}>
        {saving ? bank.saving : bank.saveButton}
      </BbButton>

      {onCancel && (
        <BbButton type="button" variant="secondary" fullWidth onClick={onCancel}>
          {bank.cancelButton}
        </BbButton>
      )}
    </div>
  )
}

export default MyBankAccountEditForm
