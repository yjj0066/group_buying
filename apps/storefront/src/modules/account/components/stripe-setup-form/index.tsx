"use client"

import { useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js"

import {
  completeStripeSetup,
  createStripeSetupSession,
} from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { Button, Text } from "@modules/common/components/ui"
import type { SavedPaymentMethod } from "types/account-group-deals"

type StripeSetupFormProps = {
  onSaved: (method: SavedPaymentMethod) => void
}

const SetupFormInner = ({
  setupIntentId,
  onSaved,
  onError,
}: {
  setupIntentId: string
  onSaved: (method: SavedPaymentMethod) => void
  onError: (message: string) => void
}) => {
  const t = useDictionary()
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)

    const result = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    })

    if (result.error) {
      onError(result.error.message ?? t.account.paymentMethods.addError)
      setLoading(false)
      return
    }

    try {
      const saved = await completeStripeSetup(setupIntentId)
      onSaved(saved)
    } catch (err) {
      onError(
        err instanceof Error ? err.message : t.account.paymentMethods.addError
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading
          ? t.account.paymentMethods.adding
          : t.account.paymentMethods.saveStripeCard}
      </Button>
    </form>
  )
}

const StripeSetupForm = ({ onSaved }: StripeSetupFormProps) => {
  const t = useDictionary()
  const [options, setOptions] = useState<StripeElementsOptions | null>(null)
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null)
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const startSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await createStripeSetupSession()

      if (!session.publishable_key || !session.client_secret) {
        setError(t.account.paymentMethods.stripeNotConfigured)
        return
      }

      setStripePromise(loadStripe(session.publishable_key))
      setOptions({
        clientSecret: session.client_secret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#FF5C8D",
          },
        },
      })
      setSetupIntentId(session.setup_intent_id)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.paymentMethods.addError
      )
    } finally {
      setLoading(false)
    }
  }

  if (!options || !setupIntentId || !stripePromise) {
    return (
      <div>
        <Button variant="secondary" disabled={loading} onClick={startSetup}>
          {loading
            ? t.account.paymentMethods.adding
            : t.account.paymentMethods.addStripeSecure}
        </Button>
        {error && <Text className="mt-2 text-sm text-red-600">{error}</Text>}
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <SetupFormInner
        setupIntentId={setupIntentId}
        onSaved={onSaved}
        onError={setError}
      />
      {error && <Text className="mt-2 text-sm text-red-600">{error}</Text>}
    </Elements>
  )
}

export default StripeSetupForm
