"use client"

import { useState } from "react"

import {
  formatAccountNumberDisplay,
  formatRegisteredDateDisplay,
  maskAccountHolderDisplay,
} from "@lib/util/bank-account-display"
import { useDictionary } from "@i18n/provider"
import MyBankAccountEditForm from "@modules/group-buying/components/my-bank-account-edit-form"
import { BbKeyValue } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { RefundBankAccount } from "types/account-group-deals"

type MyAccountViewProps = {
  initialAccount: RefundBankAccount | null
  hasActiveDeals: boolean
  startInEditMode?: boolean
}

const WireframeSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h4 className="my-2.5 mb-1.5 text-[11.5px] font-extrabold text-[#3f3d55]">
    {children}
  </h4>
)

const WireframeButton = ({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex h-7 w-full items-center justify-center rounded-[5px] border border-[var(--bb-line)] bg-[#F8F7FB] text-[10.5px] text-[#5a5870] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
)

const WireframeWarn = ({ children }: { children: React.ReactNode }) => (
  <div className="whitespace-pre-line rounded-[5px] border border-[#F0E2C2] bg-[#FFF8E8] px-2 py-1.5 text-[10px] leading-snug text-[#8a5a00]">
    {children}
  </div>
)

const MyAccountView = ({
  initialAccount,
  hasActiveDeals,
  startInEditMode = false,
}: MyAccountViewProps) => {
  const t = useDictionary()
  const bank = t.account.bankAccount
  const [editing, setEditing] = useState(startInEditMode)
  const changeBlocked = Boolean(initialAccount) && hasActiveDeals

  if (editing && !changeBlocked) {
    return (
      <section className="flex flex-col gap-3 pb-2">
        <WireframeSectionTitle>{bank.registeredAccountTitle}</WireframeSectionTitle>
        <MyBankAccountEditForm
          onCancel={
            initialAccount
              ? () => {
                  setEditing(false)
                }
              : undefined
          }
          onSaved={() => {
            setEditing(false)
          }}
        />
      </section>
    )
  }

  if (!initialAccount) {
    return (
      <section className="flex flex-col gap-3 pb-2">
        <WireframeSectionTitle>{bank.registeredAccountTitle}</WireframeSectionTitle>
        <div className="rounded-[5px] border border-dashed border-[var(--bb-line)] bg-[var(--bb-box2)] px-3 py-4 text-center text-[11px] text-[var(--bb-mute)]">
          {bank.noAccountRegistered}
        </div>
        <WireframeButton onClick={() => setEditing(true)}>
          {bank.registerButton}
        </WireframeButton>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 pb-2">
      <WireframeSectionTitle>{bank.registeredAccountTitle}</WireframeSectionTitle>

      <BbKeyValue
        compact
        className="text-[10.5px]"
        items={[
          { label: bank.bankNameLabel, value: initialAccount.bank_name },
          {
            label: bank.accountNumberLabel,
            value: formatAccountNumberDisplay(initialAccount.account_number_masked),
          },
          {
            label: bank.accountHolderLabel,
            value: maskAccountHolderDisplay(initialAccount.account_holder),
          },
          {
            label: bank.registeredAtLabel,
            value: formatRegisteredDateDisplay(initialAccount.registered_at),
          },
        ]}
      />

      <WireframeButton
        disabled={changeBlocked}
        onClick={() => setEditing(true)}
      >
        {bank.changeButton}
      </WireframeButton>

      {changeBlocked && (
        <WireframeWarn>{bank.activeDealsBlockWarning}</WireframeWarn>
      )}

      {!changeBlocked && (
        <Text className="text-[9.5px] leading-snug text-[var(--bb-mute)]">
          {bank.refundSettlementNote}
        </Text>
      )}
    </section>
  )
}

export default MyAccountView
