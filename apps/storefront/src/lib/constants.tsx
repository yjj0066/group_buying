import { CreditCard } from "@medusajs/icons"
import type { Dictionary } from "@i18n/types"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

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
})

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
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
