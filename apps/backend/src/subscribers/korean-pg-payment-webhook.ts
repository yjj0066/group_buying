import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { ProviderWebhookPayload } from "@medusajs/framework/types"
import {
  Modules,
  PaymentActions,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"

import { createKoreanPgWebhookHandler } from "../services/korean-pg-webhook-handler"
import { koreanPgWebhookSafeguardWorkflow } from "../workflows/korean-pg-webhook"

type SerializedBuffer = {
  data: ArrayBuffer
  type: "Buffer"
}

/**
 * Korean PG 전용 웹훅 안전장치 처리기.
 *
 * 성공/승인 알림은 Medusa 기본 payment-webhook subscriber가
 * `getWebhookActionAndData` 결과를 바탕으로 처리합니다.
 *
 * 이 subscriber는 취소/실패/금액 불일치 시에만 안전장치를 실행합니다.
 */
export default async function koreanPgPaymentWebhookHandler({
  event,
  container,
}: SubscriberArgs<ProviderWebhookPayload>) {
  const input = event.data

  if (input.provider !== "toss-payments") {
    return
  }

  if (
    (input.payload?.rawData as unknown as SerializedBuffer)?.type === "Buffer"
  ) {
    input.payload.rawData = Buffer.from(
      (input.payload.rawData as unknown as SerializedBuffer).data
    )
  }

  const handler = createKoreanPgWebhookHandler(container)

  let processedEvent

  try {
    processedEvent = await handler.processWebhook(input.payload)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Korean PG webhook rejected"

    container.resolve(Modules.LOGGER)?.error(
      `[korean-pg-webhook] ${message}`
    )

    return
  }

  if (
    !processedEvent.safeguardRequired ||
    !processedEvent.context ||
    !processedEvent.data?.session_id
  ) {
    return
  }

  if (
    processedEvent.action !== PaymentActions.FAILED &&
    processedEvent.action !== PaymentActions.CANCELED
  ) {
    return
  }

  const parsedEvent = handler.parseWebhookEvent(
    (input.payload.data ?? {}) as Record<string, unknown>
  )

  await koreanPgWebhookSafeguardWorkflow(container).run({
    input: {
      provider: input.provider,
      payload: input.payload,
      reason: processedEvent.safeguardReason ?? "webhook_safeguard",
      event: parsedEvent,
      context: processedEvent.context,
    },
  })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
  context: {
    subscriberId: "korean-pg-payment-webhook-handler",
  },
}
