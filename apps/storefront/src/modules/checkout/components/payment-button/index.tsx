"use client"

import {
  isManual,
  isStripeGroupDeal,
  isStripePaymentIntent,
  isTossPayments,
} from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { confirmPaymentSessionData } from "@lib/data/payment"
import {
  getActivePaymentSession,
  getPaymentSessionData,
  isStripeSetupReservation,
  isTossBillingReservation,
  resolveTossClientKey,
} from "@lib/util/checkout-payment"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useDictionary } from "@i18n/provider"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { usePathname, useSearchParams } from "next/navigation"
import React, { useEffect, useRef, useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const t = useDictionary()
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = getActivePaymentSession(cart)

  switch (true) {
    case isTossPayments(paymentSession?.provider_id):
      return (
        <TossPaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isStripeGroupDeal(paymentSession?.provider_id):
      return (
        <StripeSetupPaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isStripePaymentIntent(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    default:
      return <Button disabled>{t.checkout.selectPaymentMethod}</Button>
  }
}

const TossPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useDictionary()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const session = getActivePaymentSession(cart)
  const sessionData = getPaymentSessionData(session)
  const isBillingReservation = isTossBillingReservation(session)
  const clientKey = resolveTossClientKey(session)
  const customerKey = sessionData.customerKey as string | undefined
  const orderId = sessionData.orderId as string | undefined

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const handledReturnRef = useRef(false)

  const authKeyFromParams = searchParams.get("authKey")
  const paymentKeyFromParams = searchParams.get("paymentKey")

  const buildReturnUrl = () => {
    if (typeof window === "undefined") {
      return ""
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("step", "review")
    params.set("toss_return", "1")

    return `${window.location.origin}${pathname}?${params.toString()}`
  }

  const completeOrderWithProviderData = async (
    providerData: Record<string, unknown>
  ) => {
    if (!session?.id || !cart.payment_collection?.id) {
      throw new Error("Payment session is missing")
    }

    await confirmPaymentSessionData({
      paymentCollectionId: cart.payment_collection.id,
      paymentSessionId: session.id,
      data: providerData,
    })

    await placeOrder()
  }

  useEffect(() => {
    if (handledReturnRef.current) {
      return
    }

    const returnedCustomerKey = searchParams.get("customerKey")
    const returnedOrderId = searchParams.get("orderId")

    if (!authKeyFromParams && !paymentKeyFromParams) {
      return
    }

    handledReturnRef.current = true
    setSubmitting(true)
    setErrorMessage(null)

    const providerData = authKeyFromParams
      ? {
          authKey: authKeyFromParams,
          customerKey: returnedCustomerKey ?? customerKey,
          orderId: returnedOrderId ?? orderId,
        }
      : {
          paymentKey: paymentKeyFromParams,
          orderId: returnedOrderId ?? orderId,
          amount: cart.total,
        }

    completeOrderWithProviderData(providerData)
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : "Toss payment failed"
        )
        setSubmitting(false)
        handledReturnRef.current = false
      })
  }, [
    authKeyFromParams,
    cart.payment_collection?.id,
    cart.total,
    customerKey,
    orderId,
    paymentKeyFromParams,
    searchParams,
    session?.id,
  ])

  const handlePayment = async () => {
    if (!clientKey || !customerKey || !orderId) {
      setErrorMessage(t.checkout.tossClientKeyMissing)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const { loadPaymentWidget } = await import(
        "@tosspayments/payment-widget-sdk"
      )

      const widget = await loadPaymentWidget(clientKey, customerKey)
      const successUrl = buildReturnUrl()
      const failUrl = `${successUrl}&toss_failed=1`

      if (isBillingReservation) {
        await widget.requestBillingAuth({
          method: "CARD",
          successUrl,
          failUrl,
          customerEmail: cart.email ?? undefined,
          orderId,
        })
        return
      }

      await widget.requestPayment({
        orderId,
        orderName: t.checkout.placeOrder,
        successUrl,
        failUrl,
        customerEmail: cart.email ?? undefined,
        amount: cart.total ?? 0,
      })
    } catch (error) {
      setSubmitting(false)
      setErrorMessage(
        error instanceof Error ? error.message : "Toss payment failed"
      )
    }
  }

  return (
    <>
      <Button
        disabled={notReady || submitting}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {isBillingReservation
          ? t.checkout.saveCardAndJoin
          : t.checkout.placeOrder}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="toss-payment-error-message"
      />
    </>
  )
}

const StripeSetupPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useDictionary()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stripe = useStripe()
  const elements = useElements()
  const session = getActivePaymentSession(cart)
  const isSetupReservation = isStripeSetupReservation(session)

  const disabled = !stripe || !elements

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    if (!stripe || !elements) {
      setSubmitting(false)
      return
    }

    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: [
                cart.billing_address?.first_name,
                cart.billing_address?.last_name,
              ]
                .filter(Boolean)
                .join(" "),
              email: cart.email ?? undefined,
              phone: cart.billing_address?.phone ?? undefined,
              address: {
                city: cart.billing_address?.city ?? undefined,
                country: cart.billing_address?.country_code ?? undefined,
                line1: cart.billing_address?.address_1 ?? undefined,
                line2: cart.billing_address?.address_2 ?? undefined,
                postal_code: cart.billing_address?.postal_code ?? undefined,
                state: cart.billing_address?.province ?? undefined,
              },
            },
          },
        },
      })

      if (result.error) {
        setErrorMessage(result.error.message ?? "Stripe setup failed")
        setSubmitting(false)
        return
      }

      await placeOrder()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Stripe setup failed"
      )
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {isSetupReservation
          ? t.checkout.saveCardAndJoin
          : t.checkout.placeOrder}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-setup-payment-error-message"
      />
    </>
  )
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useDictionary()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = getActivePaymentSession(cart)

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {t.checkout.placeOrder}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const t = useDictionary()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        {t.checkout.placeOrder}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
