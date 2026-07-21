import type { Logger, ProviderWebhookPayload } from "@medusajs/framework/types"
import {
  BigNumber,
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type { WebhookActionResult } from "@medusajs/framework/types"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  assertTossPaymentsOptions,
  createTossPaymentsClient,
  TossPaymentsClient,
} from "../modules/toss-payments/client"
import type {
  TossPaymentsProviderOptions,
  TossWebhookEvent,
} from "../modules/toss-payments/types"
import { resolveTossPaymentsOptionsFromEnv } from "../utils/toss-payments-options"
import { GroupDealParticipantStatus } from "../types/group-buying"

export type KoreanPgWebhookHandlerContext = {
  paymentSessionId?: string
  expectedAmount: number
  receivedAmount?: number
  currencyCode: string
  orderId?: string
  cartId?: string
  groupDealParticipantId?: string
  paymentKey?: string
  paymentData?: Record<string, unknown>
  paymentId?: string
  source: "payment_session" | "group_deal_participant" | "order"
}

export type KoreanPgWebhookValidationResult = {
  isValid: boolean
  expectedAmount?: number
  receivedAmount?: number
  currencyCode?: string
  paymentSessionId?: string
  orderId?: string
  cartId?: string
  groupDealParticipantId?: string
  paymentKey?: string
  paymentData?: Record<string, unknown>
  reason?: string
}

export type KoreanPgWebhookProcessResult = WebhookActionResult & {
  safeguardRequired?: boolean
  safeguardReason?: string
  context?: KoreanPgWebhookHandlerContext
}

const SUCCESS_EVENT_TYPES = new Set([
  "payment.captured",
  "PAYMENT_STATUS_CHANGED_PAID",
  "payment.succeeded",
])

const CANCEL_EVENT_TYPES = new Set([
  "payment.canceled",
  "PAYMENT_STATUS_CHANGED_CANCELLED",
])

const FAIL_EVENT_TYPES = new Set(["payment.failed", "payment.aborted"])

const AUTHORIZED_EVENT_TYPES = new Set([
  "payment.authorized",
  "PAYMENT_STATUS_CHANGED_AUTHORIZED",
])

export class KoreanPgWebhookHandler {
  protected readonly pgClient_: TossPaymentsClient
  protected readonly logger_: Logger
  protected readonly container_: {
    resolve: <T>(key: string) => T
    logger?: Logger
  }

  constructor(
    container: {
      resolve: <T>(key: string) => T
      logger?: Logger
    },
    options?: TossPaymentsProviderOptions
  ) {
    this.container_ = container
    this.logger_ = (container.logger ?? console) as Logger

    const pgOptions: TossPaymentsProviderOptions =
      options ?? resolveTossPaymentsOptionsFromEnv()

    assertTossPaymentsOptions(pgOptions)
    this.pgClient_ = createTossPaymentsClient(pgOptions)
  }

  parseWebhookEvent(payload: Record<string, unknown>): TossWebhookEvent {
    return this.pgClient_.parseWebhookPayload(payload)
  }

  async processWebhook(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<KoreanPgWebhookProcessResult> {
    const normalizedHeaders = this.normalizeHeaders(payload.headers)
    const signature = this.extractSignature(normalizedHeaders)
    const rawBody =
      typeof payload.rawData === "string"
        ? payload.rawData
        : Buffer.isBuffer(payload.rawData)
          ? payload.rawData.toString("utf8")
          : JSON.stringify(payload.data ?? {})

    if (
      !this.pgClient_.verifyWebhookSignature({
        rawBody,
        signature,
        headers: normalizedHeaders,
      })
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Invalid Korean PG webhook signature"
      )
    }

    const event = this.pgClient_.parseWebhookPayload(
      (payload.data ?? {}) as Record<string, unknown>
    )

    const externalReference = this.resolveExternalReference(event)

    if (!externalReference) {
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }

    const context = await this.resolvePaymentContext(externalReference, event)

    if (!context) {
      this.logger_.warn(
        `[korean-pg-webhook] No payment context found for reference ${externalReference}`
      )

      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }

    if (CANCEL_EVENT_TYPES.has(event.eventType)) {
      return {
        action: PaymentActions.CANCELED,
        safeguardRequired: true,
        safeguardReason: "pg_cancel_notification",
        context,
        data: {
          session_id: context.paymentSessionId ?? "",
          amount: new BigNumber(event.amount ?? context.expectedAmount),
        },
      }
    }

    if (FAIL_EVENT_TYPES.has(event.eventType)) {
      return {
        action: PaymentActions.FAILED,
        safeguardRequired: true,
        safeguardReason: "pg_failure_notification",
        context,
        data: {
          session_id: context.paymentSessionId ?? "",
          amount: new BigNumber(event.amount ?? context.expectedAmount),
        },
      }
    }

    const isSuccessEvent = SUCCESS_EVENT_TYPES.has(event.eventType)
    const isAuthorizedEvent = AUTHORIZED_EVENT_TYPES.has(event.eventType)

    if (!isSuccessEvent && !isAuthorizedEvent) {
      this.logger_.warn(
        `[korean-pg-webhook] Unsupported event type: ${event.eventType}`
      )

      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: {
          session_id: context.paymentSessionId ?? "",
          amount: new BigNumber(event.amount ?? 0),
        },
      }
    }

    const validation = this.validatePaymentAmount(context, event)

    if (!validation.isValid) {
      this.logger_.error(
        `[korean-pg-webhook] Amount mismatch for ${externalReference}. expected=${validation.expectedAmount}, received=${validation.receivedAmount}`
      )

      return {
        action: PaymentActions.FAILED,
        safeguardRequired: true,
        safeguardReason: validation.reason ?? "amount_mismatch",
        context,
        data: {
          session_id: context.paymentSessionId ?? "",
          amount: new BigNumber(validation.receivedAmount ?? 0),
        },
      }
    }

    if (context.groupDealParticipantId && isSuccessEvent) {
      await this.confirmGroupDealParticipantFromWebhook(
        context.groupDealParticipantId,
        event
      )
    }

    return {
      action: isSuccessEvent
        ? PaymentActions.SUCCESSFUL
        : PaymentActions.AUTHORIZED,
      context,
      data: {
        session_id: context.paymentSessionId ?? "",
        amount: new BigNumber(validation.receivedAmount ?? context.expectedAmount),
      },
    }
  }

  async executeSafeguardCancel(input: {
    context: KoreanPgWebhookHandlerContext
    event: TossWebhookEvent
    reason: string
  }): Promise<void> {
    const { context, event, reason } = input

    try {
      await this.pgClient_.cancelPayment({
        orderId: event.orderId ?? context.orderId ?? "",
        paymentKey: event.paymentKey ?? context.paymentKey,
        reason,
      })
    } catch (error) {
      this.logger_.error(
        `[korean-pg-webhook] Failed to cancel payment at PG for ${event.orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    if (context.paymentSessionId) {
      await this.cancelMedusaPaymentSession(context.paymentSessionId, reason)
    }

    if (context.paymentId) {
      const paymentModule = this.container_.resolve(Modules.PAYMENT) as {
        cancelPayment: (id: string) => Promise<unknown>
      }

      try {
        await paymentModule.cancelPayment(context.paymentId)
      } catch (error) {
        this.logger_.error(
          `[korean-pg-webhook] Failed to cancel Medusa payment ${context.paymentId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    if (context.orderId) {
      await this.cancelMedusaOrder(context.orderId, reason)
    }

    if (context.groupDealParticipantId) {
      await this.failGroupDealParticipant(context.groupDealParticipantId, reason)
    }
  }

  protected async resolvePaymentContext(
    externalReference: string,
    event: TossWebhookEvent
  ): Promise<KoreanPgWebhookHandlerContext | null> {
    const query = this.container_.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (config: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }

    const {
      data: [paymentSession],
    } = await query.graph({
      entity: "payment_session",
      fields: [
        "id",
        "amount",
        "currency_code",
        "data",
        "provider_id",
        "payment_collection.id",
        "payment_collection.amount",
        "payment_collection.currency_code",
      ],
      filters: { id: externalReference },
    })

    if (paymentSession) {
      const session = paymentSession as {
        id: string
        amount?: number | string
        currency_code?: string
        data?: Record<string, unknown>
        payment_collection?: {
          id?: string
          amount?: number | string
          currency_code?: string
        }
      }

      const cartId = await this.resolveCartIdByPaymentCollection(
        session.payment_collection?.id
      )
      const orderId = cartId
        ? await this.resolveOrderIdByCartId(cartId)
        : undefined

      const expectedAmount = this.pickExpectedAmount({
        sessionAmount: session.amount,
        collectionAmount: session.payment_collection?.amount,
        orderAmount: orderId
          ? await this.resolveOrderTotal(orderId)
          : undefined,
      })

      const paymentId = await this.resolvePaymentIdBySession(session.id)

      return {
        paymentSessionId: session.id,
        expectedAmount,
        receivedAmount: event.amount,
        currencyCode:
          session.currency_code ??
          session.payment_collection?.currency_code ??
          event.currencyCode ??
          "KRW",
        orderId,
        cartId,
        paymentKey: event.paymentKey || (session.data?.paymentKey as string),
        paymentData: session.data,
        paymentId,
        source: orderId ? "order" : "payment_session",
      }
    }

    const groupBuyingService: GroupBuyingModuleService =
      this.container_.resolve(GROUP_BUYING_MODULE)

    const participants = await groupBuyingService.listGroupDealParticipants({
      payment_session_id: externalReference,
    })

    const participant = participants[0] as
      | {
          id: string
          quantity: number
          group_deal_id: string
          payment_session_id?: string | null
        }
      | undefined

    if (!participant) {
      return null
    }

    const groupDeal = await groupBuyingService.retrieveGroupDeal(
      participant.group_deal_id
    )

    const expectedAmount =
      Number(groupDeal.deal_price) * Number(participant.quantity)

    return {
      paymentSessionId: participant.payment_session_id ?? undefined,
      expectedAmount,
      receivedAmount: event.amount,
      currencyCode: groupDeal.currency_code ?? event.currencyCode ?? "KRW",
      groupDealParticipantId: participant.id,
      orderId: externalReference,
      paymentKey: event.paymentKey,
      source: "group_deal_participant",
    }
  }

  protected validatePaymentAmount(
    context: KoreanPgWebhookHandlerContext,
    event: TossWebhookEvent
  ): KoreanPgWebhookValidationResult {
    const receivedAmount = normalizeAmount(event.amount)
    const expectedAmount = normalizeAmount(context.expectedAmount)

    if (receivedAmount == null) {
      return {
        isValid: false,
        expectedAmount,
        receivedAmount,
        reason: "missing_webhook_amount",
        paymentSessionId: context.paymentSessionId,
        orderId: context.orderId,
        cartId: context.cartId,
        groupDealParticipantId: context.groupDealParticipantId,
        paymentKey: context.paymentKey,
        paymentData: context.paymentData,
        currencyCode: context.currencyCode,
      }
    }

    if (receivedAmount !== expectedAmount) {
      return {
        isValid: false,
        expectedAmount,
        receivedAmount,
        reason: "amount_mismatch",
        paymentSessionId: context.paymentSessionId,
        orderId: context.orderId,
        cartId: context.cartId,
        groupDealParticipantId: context.groupDealParticipantId,
        paymentKey: context.paymentKey,
        paymentData: context.paymentData,
        currencyCode: context.currencyCode,
      }
    }

    return {
      isValid: true,
      expectedAmount,
      receivedAmount,
      paymentSessionId: context.paymentSessionId,
      orderId: context.orderId,
      cartId: context.cartId,
      groupDealParticipantId: context.groupDealParticipantId,
      paymentKey: context.paymentKey,
      paymentData: context.paymentData,
      currencyCode: context.currencyCode,
    }
  }

  protected async confirmGroupDealParticipantFromWebhook(
    participantId: string,
    event: TossWebhookEvent
  ) {
    const groupBuyingService: GroupBuyingModuleService =
      this.container_.resolve(GROUP_BUYING_MODULE)

    const participant =
      await groupBuyingService.retrieveGroupDealParticipant(participantId)

    if (participant.status === GroupDealParticipantStatus.CONFIRMED) {
      return
    }

    await groupBuyingService.updateGroupDealParticipants({
      id: participantId,
      status: GroupDealParticipantStatus.CONFIRMED,
      captured_at: new Date(),
      order_id: event.transactionId ?? participant.order_id,
      last_capture_error: null,
    })

    await groupBuyingService.recalculateDealMetrics(participant.group_deal_id)
  }

  protected async failGroupDealParticipant(
    participantId: string,
    reason: string
  ) {
    const groupBuyingService: GroupBuyingModuleService =
      this.container_.resolve(GROUP_BUYING_MODULE)

    const participant =
      await groupBuyingService.retrieveGroupDealParticipant(participantId)

    await groupBuyingService.updateGroupDealParticipants({
      id: participantId,
      status: GroupDealParticipantStatus.CAPTURE_FAILED,
      last_capture_error: reason,
    })

    await groupBuyingService.recalculateDealMetrics(participant.group_deal_id)
  }

  protected async cancelMedusaPaymentSession(
    paymentSessionId: string,
    reason: string
  ) {
    const paymentModule = this.container_.resolve(Modules.PAYMENT) as {
      updatePaymentSession: (data: {
        id: string
        status: PaymentSessionStatus
        data?: Record<string, unknown>
        metadata?: Record<string, unknown>
      }) => Promise<unknown>
    }

    await paymentModule.updatePaymentSession({
      id: paymentSessionId,
      status: PaymentSessionStatus.CANCELED,
      metadata: {
        safeguard_cancel_reason: reason,
        safeguard_canceled_at: new Date().toISOString(),
      },
    })
  }

  protected async cancelMedusaOrder(orderId: string, reason: string) {
    try {
      const workflowEngine = this.container_.resolve(Modules.WORKFLOW_ENGINE) as {
        run: (
          workflowId: string,
          input: { input: Record<string, unknown> }
        ) => Promise<unknown>
      }

      await workflowEngine.run("cancel-order", {
        input: {
          order_id: orderId,
        },
      })
    } catch (error) {
      this.logger_.error(
        `[korean-pg-webhook] Failed to cancel order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  protected async resolveCartIdByPaymentCollection(
    paymentCollectionId?: string
  ): Promise<string | undefined> {
    if (!paymentCollectionId) {
      return undefined
    }

    const query = this.container_.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (config: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }

    const {
      data: [link],
    } = await query.graph({
      entity: "cart_payment_collection",
      fields: ["cart_id"],
      filters: { payment_collection_id: paymentCollectionId },
    })

    return (link as { cart_id?: string } | undefined)?.cart_id
  }

  protected async resolveOrderIdByCartId(
    cartId: string
  ): Promise<string | undefined> {
    const query = this.container_.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (config: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }

    const {
      data: [link],
    } = await query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id: cartId },
    })

    return (link as { order_id?: string } | undefined)?.order_id
  }

  protected async resolveOrderTotal(orderId: string): Promise<number | undefined> {
    const query = this.container_.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (config: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "summary.current_order_total"],
      filters: { id: orderId },
    })

    const total = (order as { summary?: { current_order_total?: number } })
      ?.summary?.current_order_total

    return total == null ? undefined : normalizeAmount(total)
  }

  protected async resolvePaymentIdBySession(
    paymentSessionId: string
  ): Promise<string | undefined> {
    const query = this.container_.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (config: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }

    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id"],
      filters: { payment_session_id: paymentSessionId },
    })

    return (payments[0] as { id?: string } | undefined)?.id
  }

  protected pickExpectedAmount(input: {
    sessionAmount?: number | string
    collectionAmount?: number | string
    orderAmount?: number
  }): number {
    if (input.orderAmount != null) {
      return input.orderAmount
    }

    if (input.sessionAmount != null) {
      return normalizeAmount(input.sessionAmount) ?? 0
    }

    return normalizeAmount(input.collectionAmount) ?? 0
  }

  protected resolveExternalReference(event: TossWebhookEvent): string {
    const orderId = event.orderId?.trim()
    const paymentKey = event.paymentKey?.trim()

    return orderId || paymentKey || ""
  }

  protected normalizeHeaders(
    headers: Record<string, unknown> | undefined
  ): Record<string, string> {
    return Object.entries(headers ?? {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key.toLowerCase()] = Array.isArray(value)
          ? String(value[0])
          : String(value)
        return acc
      },
      {}
    )
  }

  protected extractSignature(
    headers: Record<string, string>
  ): string | undefined {
    return (
      headers["tosspayments-signature"] ||
      headers["x-toss-signature"] ||
      headers["x-portone-signature"] ||
      headers["imp_signature"] ||
      headers["x-webhook-signature"]
    )
  }
}

const normalizeAmount = (value: unknown): number | undefined => {
  if (value == null) {
    return undefined
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? Math.round(amount) : undefined
}

export const createKoreanPgWebhookHandler = (
  container: {
    resolve: <T>(key: string) => T
    logger?: Logger
  },
  options?: TossPaymentsProviderOptions
): KoreanPgWebhookHandler => {
  return new KoreanPgWebhookHandler(container, options)
}
