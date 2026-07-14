import type { Logger } from "@medusajs/framework/types"

import { MedusaError } from "@medusajs/framework/utils"

import crypto from "crypto"



import {

  assertTossPaymentsOptions,

  createTossPaymentsClient,

  TossPaymentsClient,

} from "../modules/toss-payments/client"

import type { TossPaymentsProviderOptions } from "../modules/toss-payments/types"

import {

  assertStripeGroupDealOptions,

  createStripeGroupDealClient,

  StripeGroupDealClient,

} from "../modules/stripe-group-deal/client"

import type { StripeGroupDealProviderOptions } from "../modules/stripe-group-deal/types"

import { resolveTossPaymentsOptionsFromEnv, TOSS_PAYMENTS_PROVIDER_ID } from "../utils/toss-payments-options"

import { resolveStripeGroupDealOptionsFromEnv, STRIPE_GROUP_DEAL_PROVIDER_ID } from "../utils/stripe-group-deal-options"

import {

  resolvePaymentProviderKindFromId,

  type GroupDealPaymentProviderKind,

} from "../utils/group-deal-payment-provider"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"

import GroupBuyingModuleService from "../modules/group-buying/service"

import {

  GroupDealBatchCaptureResult,

  GroupDealCaptureResult,

  GroupDealParticipantStatus,

  GroupDealStatus,

} from "../types/group-buying"

import { decryptBillingKey, encryptBillingKey } from "../utils/secure-billing-key"

import {

  isPgCaptureRetryableError,

  retryWithBackoff,

} from "../utils/retry-with-backoff"



type GroupDealBillingCaptureServiceOptions = {

  maxCaptureAttempts?: number

  retryInitialDelayMs?: number

  retryMaxDelayMs?: number

}



export type StoreGroupDealPaymentReservationInput = {

  participant_id: string

  payment_provider_id: string

  payment_session_id?: string | null

  toss?: {

    billing_key: string

    billing_customer_key: string

  }

  stripe?: {

    stripe_customer_id: string

    stripe_payment_method_id: string

  }

}



const DEFAULT_MAX_CAPTURE_ATTEMPTS = Number(

  process.env.PG_CAPTURE_MAX_RETRIES ?? 3

)



export class GroupDealBillingCaptureService {

  protected readonly groupBuyingService_: GroupBuyingModuleService

  protected readonly tossClient_: TossPaymentsClient

  protected readonly stripeClient_: StripeGroupDealClient

  protected readonly logger_: Logger

  protected readonly maxCaptureAttempts_: number

  protected readonly retryInitialDelayMs_: number

  protected readonly retryMaxDelayMs_: number



  constructor(

    container: {

      resolve: <T>(key: string) => T

      logger?: Logger

    },

    options: GroupDealBillingCaptureServiceOptions = {}

  ) {

    this.groupBuyingService_ = container.resolve(GROUP_BUYING_MODULE)

    this.logger_ = container.logger ?? console



    const tossOptions: TossPaymentsProviderOptions =

      resolveTossPaymentsOptionsFromEnv()

    const stripeOptions: StripeGroupDealProviderOptions =

      resolveStripeGroupDealOptionsFromEnv()



    assertTossPaymentsOptions(tossOptions)

    assertStripeGroupDealOptions(stripeOptions)



    this.tossClient_ = createTossPaymentsClient(tossOptions)

    this.stripeClient_ = createStripeGroupDealClient(stripeOptions)



    this.maxCaptureAttempts_ =

      options.maxCaptureAttempts ?? DEFAULT_MAX_CAPTURE_ATTEMPTS

    this.retryInitialDelayMs_ = options.retryInitialDelayMs ?? 500

    this.retryMaxDelayMs_ = options.retryMaxDelayMs ?? 8_000

  }



  async captureParticipantPayment(

    participantId: string

  ): Promise<GroupDealCaptureResult> {

    const participant =

      await this.groupBuyingService_.retrieveGroupDealParticipant(

        participantId

      )



    if (participant.status !== GroupDealParticipantStatus.RESERVED) {

      throw new MedusaError(

        MedusaError.Types.NOT_ALLOWED,

        `Participant ${participantId} is not in reserved status`

      )

    }



    const providerKind = this.resolveParticipantProviderKind(participant)



    if (providerKind === "stripe") {

      return this.captureStripeParticipantPayment(participant)

    }



    return this.captureTossParticipantPayment(participant)

  }



  async captureGroupDealPayments(

    groupDealId: string

  ): Promise<GroupDealBatchCaptureResult> {

    const groupDeal =

      await this.groupBuyingService_.retrieveGroupDeal(groupDealId)



    if (

      groupDeal.status !== GroupDealStatus.MINIMUM_REACHED &&

      groupDeal.status !== GroupDealStatus.CLOSED

    ) {

      throw new MedusaError(

        MedusaError.Types.NOT_ALLOWED,

        `Group deal ${groupDealId} has not reached minimum participants yet`

      )

    }



    const reservedParticipants =

      await this.groupBuyingService_.listReservedParticipants(groupDealId)



    const results: GroupDealCaptureResult[] = []



    for (const participant of reservedParticipants) {

      try {

        const result = await this.captureParticipantPayment(participant.id)

        results.push(result)

      } catch (error) {

        const message =

          error instanceof Error ? error.message : "Unexpected capture error"



        results.push({

          participant_id: participant.id,

          success: false,

          error: message,

          attempts: participant.capture_attempts,

        })

      }

    }



    await this.groupBuyingService_.recalculateDealMetrics(groupDealId)



    return {

      group_deal_id: groupDealId,

      total: reservedParticipants.length,

      succeeded: results.filter((result) => result.success).length,

      failed: results.filter((result) => !result.success).length,

      results,

    }

  }



  async storeBillingKeyForParticipant(input: {

    participant_id: string

    billing_key: string

    billing_customer_key: string

    payment_session_id?: string | null

    payment_provider_id?: string | null

  }) {

    return this.storePaymentReservationForParticipant({

      participant_id: input.participant_id,

      payment_provider_id:

        input.payment_provider_id ?? TOSS_PAYMENTS_PROVIDER_ID,

      payment_session_id: input.payment_session_id,

      toss: {

        billing_key: input.billing_key,

        billing_customer_key: input.billing_customer_key,

      },

    })

  }



  async storeStripePaymentMethodForParticipant(input: {

    participant_id: string

    stripe_customer_id: string

    stripe_payment_method_id: string

    payment_session_id?: string | null

    payment_provider_id?: string | null

  }) {

    return this.storePaymentReservationForParticipant({

      participant_id: input.participant_id,

      payment_provider_id:

        input.payment_provider_id ?? STRIPE_GROUP_DEAL_PROVIDER_ID,

      payment_session_id: input.payment_session_id,

      stripe: {

        stripe_customer_id: input.stripe_customer_id,

        stripe_payment_method_id: input.stripe_payment_method_id,

      },

    })

  }



  async storePaymentReservationForParticipant(

    input: StoreGroupDealPaymentReservationInput

  ) {

    const participant =

      await this.groupBuyingService_.retrieveGroupDealParticipant(

        input.participant_id

      )



    if (participant.status === GroupDealParticipantStatus.RESERVED) {

      throw new MedusaError(

        MedusaError.Types.NOT_ALLOWED,

        "Payment credential is already registered for this participant"

      )

    }



    if (participant.status === GroupDealParticipantStatus.CONFIRMED) {

      throw new MedusaError(

        MedusaError.Types.NOT_ALLOWED,

        "Participant payment is already confirmed"

      )

    }



    const providerKind = resolvePaymentProviderKindFromId(

      input.payment_provider_id

    )



    const updatePayload: Record<string, unknown> = {

      id: participant.id,

      status: GroupDealParticipantStatus.RESERVED,

      payment_provider_id: input.payment_provider_id,

      payment_session_id:

        input.payment_session_id ?? participant.payment_session_id,

      reserved_at: new Date(),

      capture_attempts: 0,

      last_capture_error: null,

    }



    if (providerKind === "stripe") {

      if (!input.stripe?.stripe_customer_id || !input.stripe?.stripe_payment_method_id) {

        throw new MedusaError(

          MedusaError.Types.INVALID_DATA,

          "Stripe payment reservation requires customer and payment method"

        )

      }



      updatePayload.stripe_customer_id = input.stripe.stripe_customer_id

      updatePayload.stripe_payment_method_id_encrypted = encryptBillingKey(

        input.stripe.stripe_payment_method_id

      )

      updatePayload.billing_customer_key = null

      updatePayload.billing_key_encrypted = null

    } else {

      if (!input.toss?.billing_key || !input.toss?.billing_customer_key) {

        throw new MedusaError(

          MedusaError.Types.INVALID_DATA,

          "Toss payment reservation requires billing key and customer key"

        )

      }



      updatePayload.billing_customer_key = input.toss.billing_customer_key

      updatePayload.billing_key_encrypted = encryptBillingKey(

        input.toss.billing_key

      )

      updatePayload.stripe_customer_id = null

      updatePayload.stripe_payment_method_id_encrypted = null

    }



    const updatedParticipant =

      await this.groupBuyingService_.updateGroupDealParticipants(updatePayload)



    const updatedDeal = await this.groupBuyingService_.recalculateDealMetrics(

      participant.group_deal_id

    )



    return {

      participant: updatedParticipant,

      group_deal: updatedDeal,

      should_capture:

        updatedDeal.status === GroupDealStatus.MINIMUM_REACHED ||

        updatedDeal.status === GroupDealStatus.CLOSED,

    }

  }



  protected resolveParticipantProviderKind(participant: {

    payment_provider_id?: string | null

    stripe_customer_id?: string | null

    stripe_payment_method_id_encrypted?: string | null

    billing_key_encrypted?: string | null

  }): GroupDealPaymentProviderKind {

    const fromProviderId = resolvePaymentProviderKindFromId(

      participant.payment_provider_id

    )



    if (fromProviderId) {

      return fromProviderId

    }



    if (

      participant.stripe_customer_id ||

      participant.stripe_payment_method_id_encrypted

    ) {

      return "stripe"

    }



    return "toss"

  }



  protected async captureTossParticipantPayment(participant: {

    id: string

    group_deal_id: string

    email: string

    order_id: string | null

    billing_key_encrypted: string | null

    billing_customer_key: string | null

    payment_session_id: string | null

    capture_attempts: number

  }): Promise<GroupDealCaptureResult> {

    if (!participant.billing_key_encrypted || !participant.billing_customer_key) {

      throw new MedusaError(

        MedusaError.Types.INVALID_DATA,

        `Participant ${participant.id} is missing Toss billing key data`

      )

    }



    const groupDeal = await this.groupBuyingService_.retrieveGroupDeal(

      participant.group_deal_id

    )



    const orderId =

      participant.payment_session_id ||

      `gdeal_capture_${participant.id}_${crypto.randomUUID()}`



    let billingKey: string



    try {

      billingKey = decryptBillingKey(participant.billing_key_encrypted)

    } catch (error) {

      const message =

        error instanceof Error ? error.message : "Failed to decrypt billing key"



      await this.markCaptureFailure(participant.id, message, true)



      return {

        participant_id: participant.id,

        success: false,

        error: message,

        attempts: participant.capture_attempts + 1,

      }

    }



    const amount = await this.groupBuyingService_.getParticipantFirstPaymentAmount(

      participant.id

    )

    let attempts = participant.capture_attempts



    try {

      const captured = await retryWithBackoff(

        async (attempt) => {

          attempts = participant.capture_attempts + attempt



          return this.tossClient_.captureWithBillingKey({

            billingKey,

            customerKey: participant.billing_customer_key!,

            orderId,

            amount,

            currencyCode: groupDeal.currency_code,

            orderName: groupDeal.title,

            customerEmail: participant.email,

          })

        },

        {

          maxAttempts: this.maxCaptureAttempts_,

          initialDelayMs: this.retryInitialDelayMs_,

          maxDelayMs: this.retryMaxDelayMs_,

          isRetryable: isPgCaptureRetryableError,

          onRetry: ({ attempt, error, delayMs }) => {

            this.logger_.warn(

              `[group-deal-billing] Toss capture retry ${attempt}/${this.maxCaptureAttempts_} for participant ${participant.id} in ${delayMs}ms: ${

                error instanceof Error ? error.message : String(error)

              }`

            )

          },

        }

      )



      await this.groupBuyingService_.updateGroupDealParticipants({

        id: participant.id,

        status: GroupDealParticipantStatus.CONFIRMED,

        payment_session_id: orderId,

        capture_attempts: attempts,

        last_capture_error: null,

        captured_at: new Date(),

        order_id: captured.transactionId ?? participant.order_id,

      })



      return {

        participant_id: participant.id,

        success: true,

        transaction_id: captured.transactionId,

        attempts,

      }

    } catch (error) {

      const message =

        error instanceof Error ? error.message : "Toss capture request failed"



      await this.markCaptureFailure(participant.id, message, false, attempts)



      return {

        participant_id: participant.id,

        success: false,

        error: message,

        attempts,

      }

    }

  }



  protected async captureStripeParticipantPayment(participant: {

    id: string

    group_deal_id: string

    email: string

    order_id: string | null

    stripe_customer_id: string | null

    stripe_payment_method_id_encrypted: string | null

    payment_session_id: string | null

    capture_attempts: number

  }): Promise<GroupDealCaptureResult> {

    if (

      !participant.stripe_customer_id ||

      !participant.stripe_payment_method_id_encrypted

    ) {

      throw new MedusaError(

        MedusaError.Types.INVALID_DATA,

        `Participant ${participant.id} is missing Stripe payment method data`

      )

    }



    const groupDeal = await this.groupBuyingService_.retrieveGroupDeal(

      participant.group_deal_id

    )



    const orderId =

      participant.payment_session_id ||

      `gdeal_capture_${participant.id}_${crypto.randomUUID()}`



    let paymentMethodId: string



    try {

      paymentMethodId = decryptBillingKey(

        participant.stripe_payment_method_id_encrypted

      )

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "Failed to decrypt Stripe payment method"



      await this.markCaptureFailure(participant.id, message, true)



      return {

        participant_id: participant.id,

        success: false,

        error: message,

        attempts: participant.capture_attempts + 1,

      }

    }



    const amount = await this.groupBuyingService_.getParticipantFirstPaymentAmount(

      participant.id

    )

    let attempts = participant.capture_attempts



    try {

      const captured = await retryWithBackoff(

        async (attempt) => {

          attempts = participant.capture_attempts + attempt



          return this.stripeClient_.captureOffSession({

            stripeCustomerId: participant.stripe_customer_id!,

            stripePaymentMethodId: paymentMethodId,

            orderId,

            amount,

            currencyCode: groupDeal.currency_code,

            orderName: groupDeal.title,

            customerEmail: participant.email,

            metadata: {

              group_deal_id: participant.group_deal_id,

              participant_id: participant.id,

            },

          })

        },

        {

          maxAttempts: this.maxCaptureAttempts_,

          initialDelayMs: this.retryInitialDelayMs_,

          maxDelayMs: this.retryMaxDelayMs_,

          isRetryable: isPgCaptureRetryableError,

          onRetry: ({ attempt, error, delayMs }) => {

            this.logger_.warn(

              `[group-deal-billing] Stripe capture retry ${attempt}/${this.maxCaptureAttempts_} for participant ${participant.id} in ${delayMs}ms: ${

                error instanceof Error ? error.message : String(error)

              }`

            )

          },

        }

      )



      await this.groupBuyingService_.updateGroupDealParticipants({

        id: participant.id,

        status: GroupDealParticipantStatus.CONFIRMED,

        payment_session_id: orderId,

        capture_attempts: attempts,

        last_capture_error: null,

        captured_at: new Date(),

        order_id: captured.transactionId ?? participant.order_id,

      })



      return {

        participant_id: participant.id,

        success: true,

        transaction_id: captured.transactionId,

        attempts,

      }

    } catch (error) {

      const message =

        error instanceof Error ? error.message : "Stripe capture request failed"



      await this.markCaptureFailure(participant.id, message, false, attempts)



      return {

        participant_id: participant.id,

        success: false,

        error: message,

        attempts,

      }

    }

  }



  protected async markCaptureFailure(

    participantId: string,

    message: string,

    permanent: boolean,

    attempts?: number

  ) {

    const participant =

      await this.groupBuyingService_.retrieveGroupDealParticipant(

        participantId

      )



    const nextAttempts = attempts ?? participant.capture_attempts + 1

    const reachedMaxAttempts = nextAttempts >= this.maxCaptureAttempts_



    await this.groupBuyingService_.updateGroupDealParticipants({

      id: participantId,

      capture_attempts: nextAttempts,

      last_capture_error: message,

      status:

        permanent || reachedMaxAttempts

          ? GroupDealParticipantStatus.CAPTURE_FAILED

          : GroupDealParticipantStatus.RESERVED,

    })

  }

}



export const createGroupDealBillingCaptureService = (

  container: {

    resolve: <T>(key: string) => T

    logger?: Logger

  },

  options?: GroupDealBillingCaptureServiceOptions

): GroupDealBillingCaptureService => {

  return new GroupDealBillingCaptureService(container, options)

}


