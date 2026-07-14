import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { ProviderWebhookPayload } from "@medusajs/framework/types"

import {
  createKoreanPgWebhookHandler,
  KoreanPgWebhookHandler,
} from "../services/korean-pg-webhook-handler"
import type { TossWebhookEvent } from "../modules/toss-payments/types"
import { resolveTossPaymentsOptionsFromEnv } from "../utils/toss-payments-options"
import {
  assertTossPaymentsOptions,
  createTossPaymentsClient,
} from "../modules/toss-payments/client"

export type KoreanPgWebhookSafeguardInput = {
  provider: string
  payload: ProviderWebhookPayload["payload"]
  reason: string
  event: TossWebhookEvent
  context: NonNullable<
    Awaited<ReturnType<KoreanPgWebhookHandler["processWebhook"]>>["context"]
  >
}

const koreanPgWebhookSafeguardStep = createStep(
  "korean-pg-webhook-safeguard",
  async (input: KoreanPgWebhookSafeguardInput, { container }) => {
    const handler = createKoreanPgWebhookHandler(container)

    await handler.executeSafeguardCancel({
      context: input.context,
      event: input.event,
      reason: input.reason,
    })

    return new StepResponse({
      safeguarded: true,
      reason: input.reason,
      payment_session_id: input.context.paymentSessionId,
      order_id: input.context.orderId,
      participant_id: input.context.groupDealParticipantId,
    })
  }
)

export const koreanPgWebhookSafeguardWorkflow = createWorkflow(
  "korean-pg-webhook-safeguard",
  (input: KoreanPgWebhookSafeguardInput) => {
    const result = koreanPgWebhookSafeguardStep(input)

    return new WorkflowResponse(result)
  }
)

export type ResolveKoreanPgWebhookInput = {
  provider: string
  payload: ProviderWebhookPayload["payload"]
}

const resolveKoreanPgWebhookStep = createStep(
  "resolve-korean-pg-webhook",
  async (input: ResolveKoreanPgWebhookInput, { container }) => {
    const handler = createKoreanPgWebhookHandler(container)
    const result = await handler.processWebhook(input.payload)

    return new StepResponse(result)
  }
)

export const resolveKoreanPgWebhookWorkflow = createWorkflow(
  "resolve-korean-pg-webhook",
  (input: ResolveKoreanPgWebhookInput) => {
    const result = resolveKoreanPgWebhookStep(input)

    return new WorkflowResponse(result)
  }
)

export const cancelPgTransaction = async (input: {
  orderId: string
  paymentKey?: string
  transactionId?: string
  reason: string
}) => {
  const options = resolveTossPaymentsOptionsFromEnv()

  assertTossPaymentsOptions(options)

  const client = createTossPaymentsClient(options)

  return client.cancelPayment({
    orderId: input.orderId,
    paymentKey: input.paymentKey,
    reason: input.reason,
  })
}

export const resolvePaymentModule = (container: {
  resolve: <T>(key: string) => T
}) => container.resolve(Modules.PAYMENT)
