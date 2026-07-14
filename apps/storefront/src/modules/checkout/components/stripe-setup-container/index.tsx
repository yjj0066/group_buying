"use client"

import { Text } from "@modules/common/components/ui"
import { useDictionary } from "@i18n/provider"
import { isStripeSetupReservation } from "@lib/util/checkout-payment"
import { HttpTypes } from "@medusajs/types"
import { PaymentElement } from "@stripe/react-stripe-js"
import { useContext, useEffect, useMemo } from "react"
import type { JSX } from "react"
import PaymentContainer from "../payment-container"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"

type StripeSetupContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  paymentSession?: HttpTypes.StorePaymentSession
  onReadyChange?: (ready: boolean) => void
}

const StripeSetupContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  paymentSession,
  onReadyChange,
}: StripeSetupContainerProps) => {
  const t = useDictionary()
  const stripeReady = useContext(StripeContext)
  const isSetupReservation = isStripeSetupReservation(paymentSession)
  const isSelected = selectedPaymentOptionId === paymentProviderId

  useEffect(() => {
    onReadyChange?.(isSelected ? stripeReady : false)
  }, [isSelected, onReadyChange, stripeReady])

  const paymentElementOptions = useMemo(
    () => ({
      layout: "tabs" as const,
    }),
    []
  )

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
    >
      {isSelected && (
        <div className="my-4 transition-all duration-150 ease-in-out">
          {isSetupReservation && (
            <Text className="txt-medium text-ui-fg-subtle mb-3">
              {t.checkout.groupDealReservationDescription}
            </Text>
          )}
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {isSetupReservation
              ? t.checkout.saveCardDetails
              : t.checkout.enterCardDetails}
          </Text>
          {stripeReady ? (
            <PaymentElement options={paymentElementOptions} />
          ) : (
            <SkeletonCardDetails />
          )}
        </div>
      )}
    </PaymentContainer>
  )
}

export default StripeSetupContainer
