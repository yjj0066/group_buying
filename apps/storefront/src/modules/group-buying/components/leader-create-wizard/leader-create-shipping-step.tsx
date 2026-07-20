"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { KOREAN_BANK_OPTIONS } from "@lib/constants/korean-banks"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

import { LEADER_CREATE_WIZARD_STEP_INDEX } from "./constants"
import { LeaderCreateStepper } from "./leader-create-stepper"
import { loadLeaderCreateDraft, saveLeaderCreateDraft } from "./storage"
import {
  createEmptyShippingMethod,
  type LeaderCreateDraft,
} from "./types"
import { isLeaderCreateShippingStepValid } from "./validation"

export const LeaderCreateShippingStep = () => {
  const t = useDictionary()
  const w = t.gbApp.leaderCreateWizard
  const bank = t.account.bankAccount
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [draft, setDraft] = useState<LeaderCreateDraft>(() => loadLeaderCreateDraft())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    saveLeaderCreateDraft(draft)
  }, [draft])

  const patch = (partial: Partial<LeaderCreateDraft>) => {
    setDraft((current) => ({ ...current, ...partial }))
  }

  const handleAddShippingMethod = () => {
    patch({
      shippingMethods: [...draft.shippingMethods, createEmptyShippingMethod()],
    })
  }

  const handleRemoveShippingMethod = (id: string) => {
    if (draft.shippingMethods.length <= 1) {
      return
    }

    patch({
      shippingMethods: draft.shippingMethods.filter((method) => method.id !== id),
    })
  }

  const handleSubmit = () => {
    if (!isLeaderCreateShippingStepValid(draft)) {
      setError(w.requiredFieldsError)
      return
    }

    saveLeaderCreateDraft(draft)
    setError(null)
    router.push(gbAppRoutes.sellerCreateDeposit(countryCode))
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbSectionHeader title={w.title} />
      <LeaderCreateStepper currentIndex={LEADER_CREATE_WIZARD_STEP_INDEX.shipping} />

      <section className="flex flex-col gap-3">
        <Text className="text-sm font-bold text-[var(--bb-ink)]">
          {w.depositPeriodTitle}
        </Text>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--bb-mute)]">
            {w.depositStartLabel}
            <input
              type="date"
              className="bb-input"
              value={draft.depositPeriodStartDate}
              onChange={(event) =>
                patch({ depositPeriodStartDate: event.target.value })
              }
              data-testid="leader-create-deposit-start-date"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--bb-mute)]">
            {w.depositStartTimeLabel}
            <input
              type="time"
              className="bb-input"
              value={draft.depositPeriodStartTime}
              onChange={(event) =>
                patch({ depositPeriodStartTime: event.target.value })
              }
              data-testid="leader-create-deposit-start-time"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--bb-mute)]">
            {w.depositEndLabel}
            <input
              type="date"
              className="bb-input"
              value={draft.depositPeriodEndDate}
              onChange={(event) =>
                patch({ depositPeriodEndDate: event.target.value })
              }
              data-testid="leader-create-deposit-end-date"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--bb-mute)]">
            {w.depositEndTimeLabel}
            <input
              type="time"
              className="bb-input"
              value={draft.depositPeriodEndTime}
              onChange={(event) =>
                patch({ depositPeriodEndTime: event.target.value })
              }
              data-testid="leader-create-deposit-end-time"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Text className="text-sm font-bold text-[var(--bb-ink)]">
          {w.shippingMethodsTitle}
        </Text>

        {draft.shippingMethods.map((method, index) => (
          <div key={method.id} className="flex gap-2">
            <input
              className="bb-input flex-1"
              placeholder={w.shippingMethodNamePlaceholder}
              value={method.name}
              onChange={(event) => {
                const shippingMethods = [...draft.shippingMethods]
                shippingMethods[index] = {
                  ...method,
                  name: event.target.value,
                }
                patch({ shippingMethods })
              }}
              data-testid={`leader-create-shipping-name-${index}`}
            />
            <input
              className="bb-input w-28"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={w.shippingFeePlaceholder}
              value={method.fee}
              onChange={(event) => {
                const shippingMethods = [...draft.shippingMethods]
                shippingMethods[index] = {
                  ...method,
                  fee: event.target.value,
                }
                patch({ shippingMethods })
              }}
              data-testid={`leader-create-shipping-fee-${index}`}
            />
            {draft.shippingMethods.length > 1 && (
              <button
                type="button"
                className="shrink-0 rounded-xl border border-[var(--bb-line)] px-3 text-xs text-[var(--bb-mute)]"
                onClick={() => handleRemoveShippingMethod(method.id)}
                aria-label={w.removeShippingMethod}
              >
                {w.removeShippingMethod}
              </button>
            )}
          </div>
        ))}

        <BbButton
          variant="secondary"
          onClick={handleAddShippingMethod}
          data-testid="leader-create-add-shipping-method"
        >
          + {w.addShippingMethod}
        </BbButton>
      </section>

      <section className="flex flex-col gap-3">
        <Text className="text-sm font-bold text-[var(--bb-ink)]">
          {w.refundAccountTitle}
        </Text>
        <Text className="text-xs text-[var(--bb-mute)]">
          {w.refundAccountDescription}
        </Text>

        <select
          className="bb-input w-full"
          value={draft.refundAccount.bankCode}
          onChange={(event) => {
            const code = event.target.value
            const selected = KOREAN_BANK_OPTIONS.find(
              (option) => option.code === code
            )

            patch({
              refundAccount: {
                ...draft.refundAccount,
                bankCode: code,
                bankName: selected?.name ?? "",
              },
            })
          }}
          data-testid="leader-create-refund-bank-select"
        >
          <option value="" disabled>
            {w.bankSelectPlaceholder}
          </option>
          {KOREAN_BANK_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>

        <input
          className="bb-input w-full"
          inputMode="numeric"
          placeholder={bank.accountNumberPlaceholder}
          value={draft.refundAccount.accountNumber}
          onChange={(event) =>
            patch({
              refundAccount: {
                ...draft.refundAccount,
                accountNumber: event.target.value,
              },
            })
          }
          data-testid="leader-create-refund-account-number"
        />

        <input
          className="bb-input w-full"
          placeholder={bank.accountHolderPlaceholder}
          value={draft.refundAccount.accountHolder}
          onChange={(event) =>
            patch({
              refundAccount: {
                ...draft.refundAccount,
                accountHolder: event.target.value,
              },
            })
          }
          data-testid="leader-create-refund-account-holder"
        />
      </section>

      {error && (
        <BbAlert variant="error" data-testid="leader-create-shipping-error">
          {error}
        </BbAlert>
      )}

      <div className="flex gap-2">
        <BbButton
          variant="secondary"
          onClick={() => router.push(gbAppRoutes.sellerCreateSales(countryCode))}
        >
          {w.back}
        </BbButton>
        <BbButton
          fullWidth
          onClick={handleSubmit}
          data-testid="leader-create-shipping-submit"
        >
          {w.nextToDeposit}
        </BbButton>
      </div>
    </div>
  )
}

export default LeaderCreateShippingStep
