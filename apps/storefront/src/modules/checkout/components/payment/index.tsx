"use client"

import { RadioGroup } from "@headlessui/react"

import {

  getPaymentInfoMap,

  isManual,

  isStripeGroupDeal,

  isStripePaymentIntent,

  isTossPayments,

} from "@lib/constants"

import { initiatePaymentSession } from "@lib/data/cart"

import {

  getActivePaymentSession,

  getPreferredPaymentProviderId,

  isGroupDealReservationCart,

} from "@lib/util/checkout-payment"

import { CheckCircleSolid, CreditCard } from "@medusajs/icons"

import ErrorMessage from "@modules/checkout/components/error-message"

import PaymentContainer, {

  StripeCardContainer,

} from "@modules/checkout/components/payment-container"

import StripeSetupContainer from "@modules/checkout/components/stripe-setup-container"

import TossPaymentsContainer from "@modules/checkout/components/toss-payments-container"

import Divider from "@modules/common/components/divider"

import {

  Button,

  Container,

  Heading,

  Text,

  clx,

} from "@modules/common/components/ui"

import { HttpTypes } from "@medusajs/types"

import { useDictionary } from "@i18n/provider"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useCallback, useEffect, useMemo, useState } from "react"



const Payment = ({

  cart,

  availablePaymentMethods,

}: {

  cart: HttpTypes.StoreCart

  availablePaymentMethods: { id: string }[]

}) => {

  const t = useDictionary()

  const paymentInfoMap = useMemo(

    () => getPaymentInfoMap(t.checkout.paymentProviders),

    [t.checkout.paymentProviders]

  )



  const activeSession = getActivePaymentSession(cart)

  const isGroupDealReservation = isGroupDealReservationCart(cart)

  const preferredProviderId = getPreferredPaymentProviderId(cart)



  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [cardBrand, setCardBrand] = useState<string | null>(null)

  const [cardComplete, setCardComplete] = useState(false)

  const [tossReady, setTossReady] = useState(false)

  const [stripeSetupReady, setStripeSetupReady] = useState(false)

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(

    activeSession?.provider_id ?? preferredProviderId ?? ""

  )



  const searchParams = useSearchParams()

  const router = useRouter()

  const pathname = usePathname()



  const isOpen = searchParams.get("step") === "payment"



  const initiateProviderSession = async (method: string) => {

    await initiatePaymentSession(cart, {

      provider_id: method,

    })

    router.refresh()

  }



  const setPaymentMethod = async (method: string) => {

    setError(null)

    setSelectedPaymentMethod(method)



    if (

      isStripePaymentIntent(method) ||

      isStripeGroupDeal(method) ||

      isTossPayments(method)

    ) {

      await initiateProviderSession(method)

    }

  }



  const paidByGiftcard = !!(

    (cart as unknown as Record<string, unknown>)?.gift_cards &&

    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])

      ?.length > 0 &&

    cart?.total === 0

  )



  const paymentReady =

    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) ||

    paidByGiftcard



  const createQueryString = useCallback(

    (name: string, value: string) => {

      const params = new URLSearchParams(searchParams)

      params.set(name, value)



      return params.toString()

    },

    [searchParams]

  )



  const handleEdit = () => {

    router.push(pathname + "?" + createQueryString("step", "payment"), {

      scroll: false,

    })

  }



  const isPaymentInputReady = () => {

    if (paidByGiftcard) {

      return true

    }



    if (isStripePaymentIntent(selectedPaymentMethod)) {

      return cardComplete

    }



    if (isStripeGroupDeal(selectedPaymentMethod)) {

      return stripeSetupReady

    }



    if (isTossPayments(selectedPaymentMethod)) {

      return tossReady

    }



    return !!selectedPaymentMethod

  }



  const handleSubmit = async () => {

    setIsLoading(true)

    try {

      const checkActiveSession =

        activeSession?.provider_id === selectedPaymentMethod



      if (!checkActiveSession) {

        await initiateProviderSession(selectedPaymentMethod)

      }



      return router.push(pathname + "?" + createQueryString("step", "review"), {

        scroll: false,

      })

    } catch (err) {

      setError(err instanceof Error ? err.message : String(err))

    } finally {

      setIsLoading(false)

    }

  }



  useEffect(() => {

    setError(null)

  }, [isOpen])



  useEffect(() => {

    if (!isOpen || !preferredProviderId || activeSession?.provider_id) {

      return

    }



    setSelectedPaymentMethod(preferredProviderId)

    initiateProviderSession(preferredProviderId).catch((err) => {

      setError(err instanceof Error ? err.message : String(err))

    })

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [isOpen, preferredProviderId])



  const renderPaymentMethod = (paymentMethod: { id: string }) => {

    if (isTossPayments(paymentMethod.id)) {

      return (

        <TossPaymentsContainer

          paymentProviderId={paymentMethod.id}

          selectedPaymentOptionId={selectedPaymentMethod}

          paymentInfoMap={paymentInfoMap}

          paymentSession={activeSession}

          amount={cart.total ?? 0}

          onReadyChange={setTossReady}

        />

      )

    }



    if (isStripeGroupDeal(paymentMethod.id)) {

      return (

        <StripeSetupContainer

          paymentProviderId={paymentMethod.id}

          selectedPaymentOptionId={selectedPaymentMethod}

          paymentInfoMap={paymentInfoMap}

          paymentSession={activeSession}

          onReadyChange={setStripeSetupReady}

        />

      )

    }



    if (isStripePaymentIntent(paymentMethod.id)) {

      return (

        <StripeCardContainer

          paymentProviderId={paymentMethod.id}

          selectedPaymentOptionId={selectedPaymentMethod}

          paymentInfoMap={paymentInfoMap}

          setCardBrand={setCardBrand}

          setError={setError}

          setCardComplete={setCardComplete}

        />

      )

    }



    return (

      <PaymentContainer

        paymentInfoMap={paymentInfoMap}

        paymentProviderId={paymentMethod.id}

        selectedPaymentOptionId={selectedPaymentMethod}

      />

    )

  }



  return (

    <div className="bg-white">

      <div className="flex flex-row items-center justify-between mb-6">

        <Heading

          level="h2"

          className={clx(

            "flex flex-row text-3xl-regular gap-x-2 items-baseline",

            {

              "opacity-50 pointer-events-none select-none":

                !isOpen && !paymentReady,

            }

          )}

        >

          {t.checkout.payment}

          {!isOpen && paymentReady && <CheckCircleSolid />}

        </Heading>

        {!isOpen && paymentReady && (

          <Text>

            <button

              onClick={handleEdit}

              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"

              data-testid="edit-payment-button"

            >

              {t.checkout.edit}

            </button>

          </Text>

        )}

      </div>

      <div>

        <div className={isOpen ? "block" : "hidden"}>

          {isGroupDealReservation && (

            <Text className="text-small-regular text-ui-fg-subtle mb-4">

              {t.checkout.groupDealReservationTitle}

            </Text>

          )}



          {!paidByGiftcard && availablePaymentMethods?.length && (

            <RadioGroup

              value={selectedPaymentMethod}

              onChange={(value: string) => setPaymentMethod(value)}

            >

              {availablePaymentMethods.map((paymentMethod) => (

                <div key={paymentMethod.id}>{renderPaymentMethod(paymentMethod)}</div>

              ))}

            </RadioGroup>

          )}



          {paidByGiftcard && (

            <div className="flex flex-col w-1/3">

              <Text className="txt-medium-plus text-ui-fg-base mb-1">

                {t.checkout.paymentMethod}

              </Text>

              <Text

                className="txt-medium text-ui-fg-subtle"

                data-testid="payment-method-summary"

              >

                {t.checkout.giftCard}

              </Text>

            </div>

          )}



          <ErrorMessage

            error={error}

            data-testid="payment-method-error-message"

          />



          <Button

            size="large"

            className="mt-6"

            onClick={handleSubmit}

            isLoading={isLoading}

            disabled={!isPaymentInputReady() && !paidByGiftcard}

            data-testid="submit-payment-button"

          >

            {t.checkout.continueToReview}

          </Button>

        </div>



        <div className={isOpen ? "hidden" : "block"}>

          {cart && paymentReady && activeSession ? (

            <div className="flex items-start gap-x-1 w-full">

              <div className="flex flex-col w-1/3">

                <Text className="txt-medium-plus text-ui-fg-base mb-1">

                  {t.checkout.paymentMethod}

                </Text>

                <Text

                  className="txt-medium text-ui-fg-subtle"

                  data-testid="payment-method-summary"

                >

                  {paymentInfoMap[activeSession?.provider_id]?.title ||

                    activeSession?.provider_id}

                </Text>

              </div>

              <div className="flex flex-col w-1/3">

                <Text className="txt-medium-plus text-ui-fg-base mb-1">

                  {t.checkout.paymentDetails}

                </Text>

                <div

                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"

                  data-testid="payment-details-summary"

                >

                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">

                    {paymentInfoMap[selectedPaymentMethod]?.icon || (

                      <CreditCard />

                    )}

                  </Container>

                  <Text>

                    {isStripePaymentIntent(selectedPaymentMethod) && cardBrand

                      ? cardBrand

                      : isGroupDealReservation

                        ? t.checkout.cardSavedForLater

                        : t.checkout.anotherStepWillAppear}

                  </Text>

                </div>

              </div>

            </div>

          ) : paidByGiftcard ? (

            <div className="flex flex-col w-1/3">

              <Text className="txt-medium-plus text-ui-fg-base mb-1">

                {t.checkout.paymentMethod}

              </Text>

              <Text

                className="txt-medium text-ui-fg-subtle"

                data-testid="payment-method-summary"

              >

                {t.checkout.giftCard}

              </Text>

            </div>

          ) : null}

        </div>

      </div>

      <Divider className="mt-8" />

    </div>

  )

}



export default Payment


