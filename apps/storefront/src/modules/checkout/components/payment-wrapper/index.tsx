"use client"

import { loadStripe, Stripe } from "@stripe/stripe-js"
import React, { useMemo } from "react"
import StripeWrapper from "./stripe-wrapper"
import { HttpTypes } from "@medusajs/types"
import { isStripeCheckout } from "@lib/constants"
import {
  isStripeGroupDeal,
  resolveStripeClientSecret,
  resolveStripePublishableKey,
} from "@lib/util/checkout-payment"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const defaultStripeKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

const medusaAccountId = process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending"
  )

  const stripeKey = useMemo(() => {
    if (isStripeGroupDeal(paymentSession?.provider_id)) {
      return resolveStripePublishableKey(paymentSession) ?? defaultStripeKey
    }

    return defaultStripeKey
  }, [paymentSession])

  const stripePromise = useMemo(() => {
    if (!stripeKey) {
      return null
    }

    return loadStripe(
      stripeKey,
      medusaAccountId ? { stripeAccount: medusaAccountId } : undefined
    )
  }, [stripeKey])

  const clientSecret = resolveStripeClientSecret(paymentSession)

  if (
    isStripeCheckout(paymentSession?.provider_id) &&
    paymentSession &&
    stripePromise &&
    clientSecret
  ) {
    return (
      <StripeWrapper
        paymentSession={paymentSession}
        stripeKey={stripeKey}
        stripePromise={stripePromise}
        clientSecret={clientSecret}
      >
        {children}
      </StripeWrapper>
    )
  }

  return <div>{children}</div>
}

export default PaymentWrapper
