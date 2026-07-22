"use client"

import { useState } from "react"

import {
  addSavedPaymentMethod,
  createTossBillingSession,
  deleteSavedPaymentMethod,
} from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { Badge, Button, Input, Label, Text } from "@modules/common/components/ui"
import StripeSetupForm from "@modules/account/components/stripe-setup-form"
import type { SavedPaymentMethod } from "types/account-group-deals"

type PaymentMethodsPanelProps = {
  methods: SavedPaymentMethod[]
}

const PaymentMethodsPanel = ({ methods: initialMethods }: PaymentMethodsPanelProps) => {
  const t = useDictionary()
  const [methods, setMethods] = useState(initialMethods)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<"stripe" | "toss" | null>(null)
  const [label, setLabel] = useState("")
  const [last4, setLast4] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    setError(null)

    try {
      await deleteSavedPaymentMethod(id)
      setMethods((current) => current.filter((method) => method.id !== id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.paymentMethods.deleteError
      )
    } finally {
      setLoadingId(null)
    }
  }

  const handleAdd = async (provider: "stripe" | "toss") => {
    if (!label.trim()) {
      setError(t.account.paymentMethods.labelRequired)
      return
    }

    setAdding(provider)
    setError(null)

    try {
      const created = await addSavedPaymentMethod({
        provider,
        label: label.trim(),
        last4: last4.trim() || null,
        brand: provider === "stripe" ? "card" : "toss",
        is_default: methods.length === 0,
      })

      setMethods((current) => [...current, created])
      setLabel("")
      setLast4("")
      setAdding(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.paymentMethods.addError
      )
      setAdding(null)
    }
  }

  const handleAddToss = async () => {
    setAdding("toss")
    setError(null)

    try {
      const session = await createTossBillingSession()
      const params = new URLSearchParams({
        customerKey: session.customer_key,
        successUrl: session.success_url,
        failUrl: session.fail_url,
      })

      window.open(
        `https://js.tosspayments.com/v1/billing/authorize?${params.toString()}`,
        "_blank",
        "noopener,noreferrer"
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.paymentMethods.addError
      )
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      {methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">
            {t.account.paymentMethods.empty}
          </Text>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {methods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui-border-base p-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Text className="font-medium">{method.label}</Text>
                  {method.is_default && (
                    <Badge color="green">{t.account.paymentMethods.defaultBadge}</Badge>
                  )}
                </div>
                <Text className="text-xs text-ui-fg-subtle">
                  {method.provider === "stripe"
                    ? t.account.paymentMethods.stripeLabel
                    : t.account.paymentMethods.tossLabel}
                  {method.last4 ? ` · **** ${method.last4}` : ""}
                </Text>
              </div>
              <Button
                variant="secondary"
                size="small"
                disabled={loadingId === method.id}
                onClick={() => handleDelete(method.id)}
              >
                {loadingId === method.id
                  ? t.account.paymentMethods.deleting
                  : t.account.paymentMethods.deleteButton}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.account.paymentMethods.addTitle}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {t.account.paymentMethods.addDescription}
        </Text>

        <div className="mt-4 grid gap-4">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="pm-label">{t.account.paymentMethods.cardLabel}</Label>
            <Input
              id="pm-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t.account.paymentMethods.cardLabelPlaceholder}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="pm-last4">{t.account.paymentMethods.last4Label}</Label>
            <Input
              id="pm-last4"
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
              maxLength={4}
              placeholder="4242"
            />
          </div>
        </div>

        {error && (
          <Text className="mt-3 text-sm text-red-600">{error}</Text>
        )}

        <div className="mt-6 space-y-6 border-t border-ui-border-base pt-6">
          <div>
            <Text className="font-medium">Stripe</Text>
            <StripeSetupForm
              onSaved={(method) => {
                setMethods((current) => [...current, method])
                setError(null)
              }}
            />
          </div>

          <div>
            <Text className="font-medium">Toss Payments</Text>
            <Text className="mt-1 text-sm text-ui-fg-subtle">
              {t.account.paymentMethods.addDescription}
            </Text>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={adding === "toss"}
              onClick={handleAddToss}
            >
              {adding === "toss"
                ? t.account.paymentMethods.adding
                : t.account.paymentMethods.addToss}
            </Button>
          </div>
        </div>

        <div className="mt-6 border-t border-ui-border-base pt-6">
          <Text className="text-sm font-medium text-ui-fg-subtle">
            Manual alias (fallback)
          </Text>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={adding === "stripe"}
            onClick={() => handleAdd("stripe")}
          >
            {adding === "stripe"
              ? t.account.paymentMethods.adding
              : t.account.paymentMethods.addStripe}
          </Button>
          <Button
            variant="secondary"
            disabled={adding === "toss"}
            onClick={() => handleAdd("toss")}
          >
            {adding === "toss"
              ? t.account.paymentMethods.adding
              : t.account.paymentMethods.addToss}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodsPanel
