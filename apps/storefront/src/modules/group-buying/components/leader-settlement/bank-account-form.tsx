"use client"

import { useEffect, useState } from "react"

import { useDictionary } from "@i18n/provider"
import { KOREAN_BANK_OPTIONS } from "@lib/constants/korean-banks"
import {
  convertRefundBankAccountToSettlement,
  EMPTY_LEADER_SETTLEMENT_BANK_ACCOUNT,
  isLeaderSettlementBankAccountComplete,
  isRegisteredBankAccountComplete,
  type LeaderSettlementBankAccount,
} from "@lib/util/leader-settlement"
import { BbAlert, BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { RefundBankAccount } from "types/account-group-deals"

type LeaderSettlementBankFormProps = {
  value: LeaderSettlementBankAccount | null
  registeredBankAccount?: RefundBankAccount | null
  disabled?: boolean
  onChange: (account: LeaderSettlementBankAccount) => void
}

const LeaderSettlementBankForm = ({
  value,
  registeredBankAccount,
  disabled = false,
  onChange,
}: LeaderSettlementBankFormProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderSettlement
  const bank = t.account.bankAccount

  const [form, setForm] = useState<LeaderSettlementBankAccount>(
    value ?? EMPTY_LEADER_SETTLEMENT_BANK_ACCOUNT
  )
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setForm(value ?? EMPTY_LEADER_SETTLEMENT_BANK_ACCOUNT)
  }, [value])

  const updateForm = (patch: Partial<LeaderSettlementBankAccount>) => {
    const next = { ...form, ...patch }
    setForm(next)
    setFormError(null)

    if (isLeaderSettlementBankAccountComplete(next)) {
      onChange(next)
    }
  }

  const handleUseRegisteredAccount = () => {
    if (!registeredBankAccount) {
      return
    }

    const next = convertRefundBankAccountToSettlement(registeredBankAccount)
    setForm(next)
    setFormError(null)

    if (isRegisteredBankAccountComplete(registeredBankAccount)) {
      onChange(next)
      return
    }

    setFormError(labels.registeredAccountResaveRequired)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
      <Text className="text-xs leading-relaxed text-[#6B7280]">
        {labels.bankAccountDescription}
      </Text>

      {registeredBankAccount ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-3">
          <Text className="text-xs font-semibold text-[#5B21B6]">
            {labels.useRegisteredAccountTitle}
          </Text>
          <Text className="text-xs text-[#6B7280]">
            {registeredBankAccount.bank_name}{" "}
            {registeredBankAccount.account_number_masked} ·{" "}
            {registeredBankAccount.account_holder}
          </Text>
          <BbButton
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={disabled}
            onClick={handleUseRegisteredAccount}
          >
            {labels.useRegisteredAccountButton}
          </BbButton>
        </div>
      ) : null}

      {formError ? <BbAlert variant="warn">{formError}</BbAlert> : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[#111827]">{bank.bankNameLabel}</span>
        <select
          className="bb-input w-full"
          value={form.bankCode}
          disabled={disabled}
          onChange={(event) => {
            const code = event.target.value
            const selected = KOREAN_BANK_OPTIONS.find(
              (option) => option.code === code
            )

            updateForm({
              bankCode: code,
              bankName: selected?.name ?? "",
            })
          }}
        >
          <option value="">{labels.bankSelectPlaceholder}</option>
          {KOREAN_BANK_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[#111827]">
          {labels.accountNumberLabel}
        </span>
        <input
          className="bb-input w-full"
          inputMode="numeric"
          value={form.accountNumber}
          disabled={disabled}
          placeholder={bank.accountNumberPlaceholder}
          onChange={(event) =>
            updateForm({ accountNumber: event.target.value })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[#111827]">
          {labels.accountHolderLabel}
        </span>
        <input
          className="bb-input w-full"
          value={form.accountHolder}
          disabled={disabled}
          placeholder={bank.accountHolderPlaceholder}
          onChange={(event) =>
            updateForm({ accountHolder: event.target.value })
          }
        />
      </label>
    </div>
  )
}

export default LeaderSettlementBankForm
