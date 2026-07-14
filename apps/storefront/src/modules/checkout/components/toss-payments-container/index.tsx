"use client"

import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@modules/common/components/ui"
import Radio from "@modules/common/components/radio"
import { useDictionary } from "@i18n/provider"
import {
  getPaymentSessionData,
  isTossBillingReservation,
} from "@lib/util/checkout-payment"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef, useState } from "react"
import type { JSX } from "react"

type TossPaymentsContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  paymentSession?: HttpTypes.StorePaymentSession
  amount: number
  onReadyChange?: (ready: boolean) => void
}

const TossPaymentsContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  paymentSession,
  amount,
  onReadyChange,
}: TossPaymentsContainerProps) => {
  const t = useDictionary()
  const sessionData = getPaymentSessionData(paymentSession)
  const isBillingReservation = isTossBillingReservation(paymentSession)
  const clientKey = sessionData.clientKey as string | undefined
  const customerKey = sessionData.customerKey as string | undefined

  const paymentMethodsRef = useRef<HTMLDivElement>(null)
  const agreementRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<{
    renderPaymentMethods: (
      selector: string,
      amount: { value: number; currency?: string },
      options?: Record<string, unknown>
    ) => Promise<unknown>
    renderAgreement: (
      selector: string,
      options?: Record<string, unknown>
    ) => Promise<unknown>
  } | null>(null)

  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSelected = selectedPaymentOptionId === paymentProviderId

  useEffect(() => {
    onReadyChange?.(isSelected ? isReady : false)
  }, [isReady, isSelected, onReadyChange])

  useEffect(() => {
    if (!isSelected || !clientKey || !customerKey) {
      return
    }

    let cancelled = false

    const mountWidget = async () => {
      try {
        const { loadPaymentWidget } = await import(
          "@tosspayments/payment-widget-sdk"
        )

        const widget = await loadPaymentWidget(clientKey, customerKey)
        widgetRef.current = widget

        if (cancelled) {
          return
        }

        if (paymentMethodsRef.current) {
          paymentMethodsRef.current.innerHTML = ""
        }

        if (agreementRef.current) {
          agreementRef.current.innerHTML = ""
        }

        await widget.renderPaymentMethods(
          "#toss-payment-methods",
          {
            value: amount,
            currency: String(sessionData.currency_code ?? "KRW").toUpperCase(),
          },
          { variantKey: process.env.NEXT_PUBLIC_TOSS_WIDGET_VARIANT_KEY }
        )

        await widget.renderAgreement("#toss-payment-agreement", {
          variantKey: process.env.NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY,
        })

        if (!cancelled) {
          setIsReady(true)
          setError(null)
        }
      } catch (mountError) {
        if (!cancelled) {
          setIsReady(false)
          setError(
            mountError instanceof Error
              ? mountError.message
              : "Failed to load Toss Payments widget"
          )
        }
      }
    }

    mountWidget()

    return () => {
      cancelled = true
      setIsReady(false)
    }
  }, [
    amount,
    clientKey,
    customerKey,
    isSelected,
    sessionData.currency_code,
  ])

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive": isSelected,
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <Radio checked={isSelected} />
          <Text className="text-base-regular">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
        </div>
        <span className="justify-self-end text-ui-fg-base">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>

      {isSelected && (
        <div className="my-4 flex flex-col gap-y-3">
          {isBillingReservation ? (
            <Text className="text-small-regular text-ui-fg-subtle">
              {t.checkout.groupDealReservationDescription}
            </Text>
          ) : (
            <Text className="text-small-regular text-ui-fg-subtle">
              {t.checkout.tossPaymentDescription}
            </Text>
          )}

          <div id="toss-payment-methods" ref={paymentMethodsRef} />
          <div id="toss-payment-agreement" ref={agreementRef} />

          {!clientKey && (
            <Text className="text-small-regular text-ui-fg-error">
              {t.checkout.tossClientKeyMissing}
            </Text>
          )}

          {error && (
            <Text className="text-small-regular text-ui-fg-error">{error}</Text>
          )}
        </div>
      )}
    </RadioGroupOption>
  )
}

export default TossPaymentsContainer
