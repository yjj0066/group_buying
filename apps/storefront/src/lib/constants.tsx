import { CreditCard } from "@medusajs/icons"
import type { Dictionary } from "@i18n/types"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"
import {
  isStripeCheckout,
  isStripeGroupDeal,
  isStripePaymentIntent,
  isTossPayments,
  STRIPE_GROUP_DEAL_PROVIDER_ID,
  TOSS_PAYMENTS_PROVIDER_ID,
} from "@lib/util/checkout-payment"

export { TOSS_PAYMENTS_PROVIDER_ID, STRIPE_GROUP_DEAL_PROVIDER_ID }
export {
  isTossPayments,
  isStripeGroupDeal,
  isStripePaymentIntent,
  isStripeCheckout,
}

export const getPaymentInfoMap = (
  paymentProviders: Dictionary["checkout"]["paymentProviders"]
): Record<string, { title: string; icon: React.JSX.Element }> => ({
  pp_stripe_stripe: {
    title: paymentProviders.creditCard,
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: paymentProviders.creditCard,
    icon: <CreditCard />,
  },
  [STRIPE_GROUP_DEAL_PROVIDER_ID]: {
    title: paymentProviders.creditCard,
    icon: <CreditCard />,
  },
  [TOSS_PAYMENTS_PROVIDER_ID]: {
    title: paymentProviders.tossPayments,
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: paymentProviders.ideal,
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: paymentProviders.bancontact,
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: paymentProviders.paypal,
    icon: <PayPal />,
  },
  pp_system_default: {
    title: paymentProviders.manual,
    icon: <CreditCard />,
  },
})

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = getPaymentInfoMap({
  creditCard: "Credit card",
  ideal: "iDeal",
  bancontact: "Bancontact",
  paypal: "PayPal",
  manual: "Manual Payment",
  tossPayments: "Toss Payments",
})

export const isStripeLike = (providerId?: string) => {
  return isStripeCheckout(providerId)
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
