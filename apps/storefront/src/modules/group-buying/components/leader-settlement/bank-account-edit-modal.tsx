"use client"

import { useEffect, useState, type FormEvent } from "react"

import { useDictionary } from "@i18n/provider"
import { KOREAN_BANK_OPTIONS } from "@lib/constants/korean-banks"
import type { LeaderSettlementBankAccount } from "@lib/util/leader-settlement"
import { BbAlert, BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

type LeaderSettlementBankAccountEditModalProps = {
  open: boolean
  initialAccount: LeaderSettlementBankAccount
  onClose: () => void
  onSave: (account: LeaderSettlementBankAccount) => void
}

const LeaderSettlementBankAccountEditModal = ({
  open,
  initialAccount,
  onClose,
  onSave,
}: LeaderSettlementBankAccountEditModalProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderSettlement
  const bank = t.account.bankAccount

  const [bankCode, setBankCode] = useState(initialAccount.bankCode)
  const [bankName, setBankName] = useState(initialAccount.bankName)
  const [accountNumber, setAccountNumber] = useState(initialAccount.accountNumber)
  const [accountHolder, setAccountHolder] = useState(initialAccount.accountHolder)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setBankCode(initialAccount.bankCode)
    setBankName(initialAccount.bankName)
    setAccountNumber(initialAccount.accountNumber)
    setAccountHolder(initialAccount.accountHolder)
    setError(null)
  }, [initialAccount, open])

  if (!open) {
    return null
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!bankCode.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError(labels.bankRequiredError)
      return
    }

    onSave({
      bankCode: bankCode.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="leader-settlement-bank-edit-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <Text
          id="leader-settlement-bank-edit-title"
          className="text-base font-black text-[var(--bb-ink)]"
        >
          {labels.bankEditTitle}
        </Text>

        {error && <BbAlert variant="warn">{error}</BbAlert>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {bank.bankNameLabel}
          </span>
          <select
            className="bb-input w-full"
            value={bankCode}
            onChange={(event) => {
              const code = event.target.value
              const selected = KOREAN_BANK_OPTIONS.find(
                (option) => option.code === code
              )

              setBankCode(code)
              setBankName(selected?.name ?? "")
            }}
            required
          >
            <option value="" disabled>
              {labels.bankSelectPlaceholder}
            </option>
            {KOREAN_BANK_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.accountNumberLabel}
          </span>
          <input
            className="bb-input w-full"
            inputMode="numeric"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            placeholder={bank.accountNumberPlaceholder}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.accountHolderLabel}
          </span>
          <input
            className="bb-input w-full"
            value={accountHolder}
            onChange={(event) => setAccountHolder(event.target.value)}
            placeholder={bank.accountHolderPlaceholder}
            required
          />
        </label>

        <div className="flex flex-col gap-2 pt-2">
          <BbButton type="submit" variant="cta" fullWidth>
            {labels.saveBankAccount}
          </BbButton>
          <BbButton type="button" variant="secondary" fullWidth onClick={onClose}>
            {labels.cancel}
          </BbButton>
        </div>
      </form>
    </div>
  )
}

export default LeaderSettlementBankAccountEditModal
