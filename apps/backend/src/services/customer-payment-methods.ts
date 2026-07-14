import Stripe from "stripe"
import { MedusaError } from "@medusajs/framework/utils"

import {
  appendSavedPaymentMethod,
  readSavedPaymentMethods,
  type SavedPaymentMethodRecord,
} from "../utils/group-deal-account"

const createStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!apiKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe API key is not configured"
    )
  }

  return new Stripe(apiKey, { apiVersion: "2024-06-20" })
}

export const createCustomerStripeSetupIntent = async (input: {
  customerId: string
  email: string
}) => {
  const stripe = createStripe()

  const stripeCustomer = await stripe.customers.create({
    email: input.email,
    metadata: {
      medusa_customer_id: input.customerId,
    },
  })

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomer.id,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      medusa_customer_id: input.customerId,
      purpose: "saved_payment_method",
    },
  })

  if (!setupIntent.client_secret) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Stripe SetupIntent client secret is missing"
    )
  }

  return {
    setup_intent_id: setupIntent.id,
    client_secret: setupIntent.client_secret,
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  }
}

export const buildStripeSavedPaymentMethod = async (input: {
  setupIntentId: string
  metadata: Record<string, unknown> | null
}): Promise<SavedPaymentMethodRecord[]> => {
  const stripe = createStripe()
  const setupIntent = await stripe.setupIntents.retrieve(input.setupIntentId, {
    expand: ["payment_method"],
  })

  if (setupIntent.status !== "succeeded") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `SetupIntent is not completed (status=${setupIntent.status})`
    )
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

  if (!paymentMethodId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SetupIntent is missing payment method"
    )
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
  const card = paymentMethod.card
  const existing = readSavedPaymentMethods(input.metadata)

  return appendSavedPaymentMethod(existing, {
    provider: "stripe",
    label: card?.brand
      ? `${card.brand.toUpperCase()} card`
      : "Stripe card",
    is_default: existing.length === 0,
    last4: card?.last4 ?? null,
    brand: card?.brand ?? "card",
    external_id: paymentMethodId,
    setup_intent_id: setupIntent.id,
  })
}

export const createCustomerTossBillingSession = (input: {
  customerId: string
  email: string
}) => {
  const clientKey = process.env.TOSS_CLIENT_KEY

  if (!clientKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toss client key is not configured"
    )
  }

  const customerKey = `cust_${input.customerId}`.slice(0, 50)

  return {
    customer_key: customerKey,
    client_key: clientKey,
    success_url:
      process.env.TOSS_BILLING_SUCCESS_URL ?? "/account/payment-methods",
    fail_url: process.env.TOSS_BILLING_FAIL_URL ?? "/account/payment-methods",
    customer_email: input.email,
  }
}
