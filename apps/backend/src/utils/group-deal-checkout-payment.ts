import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { buildParticipantKey } from "./group-deal-rules"

import { STRIPE_GROUP_DEAL_PROVIDER_ID } from "./stripe-group-deal-options"

import { TOSS_PAYMENTS_PROVIDER_ID } from "./toss-payments-options"

import {

  resolvePaymentProviderKindFromId,

  type GroupDealPaymentProviderKind,

} from "./group-deal-payment-provider"



/** Medusa에 등록된 Toss Payments provider_id (한국 리전 전용) */

export { TOSS_PAYMENTS_PROVIDER_ID }



/** Medusa에 등록된 Stripe 공동구매 예약 provider_id (해외 리전 전용) */

export { STRIPE_GROUP_DEAL_PROVIDER_ID }



/** @deprecated Use TOSS_PAYMENTS_PROVIDER_ID */

export const KOREAN_PG_PROVIDER_ID = TOSS_PAYMENTS_PROVIDER_ID



export type GroupDealBillingPaymentData = {

  mode: "billing_reservation" | "setup_reservation" | "instant"

  providerKind?: GroupDealPaymentProviderKind

  billingKey?: string

  customerKey?: string

  stripeCustomerId?: string

  stripePaymentMethodId?: string

  orderId?: string

  paymentSessionId?: string

  providerId?: string

}



type CartLike = {

  id?: string

  email?: string | null

  customer_id?: string | null

  metadata?: Record<string, unknown> | null

  items?: Array<{

    metadata?: Record<string, unknown> | null

  }>

}



type OrderLike = {

  payment_collections?: Array<{

    payment_sessions?: Array<{

      id?: string

      provider_id?: string

      status?: string

      data?: Record<string, unknown> | null

    }>

    payments?: Array<{

      id?: string

      provider_id?: string

      data?: Record<string, unknown> | null

    }>

  }>

}



const parseReservationPaymentData = (input: {

  data: Record<string, unknown>

  providerId?: string

  paymentSessionId?: string

}): GroupDealBillingPaymentData | null => {

  const { data, providerId, paymentSessionId } = input

  const providerKind = resolvePaymentProviderKindFromId(providerId)



  if (

    data.mode === "billing_reservation" ||

    data.status === "billing_reserved"

  ) {

    return {

      mode: "billing_reservation",

      providerKind: providerKind ?? "toss",

      billingKey: data.billingKey as string | undefined,

      customerKey: data.customerKey as string | undefined,

      orderId: String(data.orderId ?? data.id ?? ""),

      paymentSessionId,

      providerId,

    }

  }



  if (

    data.mode === "setup_reservation" ||

    data.status === "setup_reserved"

  ) {

    return {

      mode: "setup_reservation",

      providerKind: providerKind ?? "stripe",

      stripeCustomerId: data.stripeCustomerId as string | undefined,

      stripePaymentMethodId: data.stripePaymentMethodId as string | undefined,

      orderId: String(data.orderId ?? data.setupIntentId ?? data.id ?? ""),

      paymentSessionId,

      providerId,

    }

  }



  return null

}



export const isGroupDealCart = (cart: CartLike): boolean => {

  if (cart.metadata?.group_deal_billing_reservation === true) {

    return true

  }



  return (

    cart.items?.some(

      (item) => (item.metadata as Record<string, unknown> | undefined)?.is_group_deal

    ) ?? false

  )

}



export const resolveGroupDealCartContext = (

  cart: CartLike

): Record<string, unknown> | null => {

  if (!isGroupDealCart(cart)) {

    return null

  }



  const metadata = (cart.metadata ?? {}) as Record<string, unknown>

  const lineItem = cart.items?.find(

    (item) => (item.metadata as Record<string, unknown> | undefined)?.is_group_deal

  )

  const lineMetadata = (lineItem?.metadata ?? {}) as Record<string, unknown>



  const groupDealId = String(

    metadata.group_deal_id ?? lineMetadata.group_deal_id ?? ""

  )

  const participantId = String(

    metadata.participant_id ?? lineMetadata.participant_id ?? ""

  )



  const customerKey =

    (metadata.billing_customer_key as string | undefined) ||

    buildParticipantKey({

      customer_id: cart.customer_id,

      email: String(cart.email ?? ""),

    })



  return {

    billing_mode: "reservation",

    customer_key: customerKey,

    group_deal: {

      id: groupDealId,

      participant_id: participantId,

      billing_reservation: true,

    },

  }

}



export const extractBillingPaymentFromOrder = (

  order: OrderLike

): GroupDealBillingPaymentData | null => {

  const collections = order.payment_collections ?? []



  for (const collection of collections) {

    for (const session of collection.payment_sessions ?? []) {

      const data = (session.data ?? {}) as Record<string, unknown>

      const parsed = parseReservationPaymentData({

        data,

        providerId: session.provider_id,

        paymentSessionId: session.id,

      })



      if (parsed) {

        return parsed

      }

    }



    for (const payment of collection.payments ?? []) {

      const data = (payment.data ?? {}) as Record<string, unknown>

      const parsed = parseReservationPaymentData({

        data,

        providerId: payment.provider_id,

      })



      if (parsed) {

        return parsed

      }

    }

  }



  return null

}



export const resolveCartIdByPaymentCollection = async (

  paymentCollectionId: string,

  container: { resolve: <T>(key: string) => T }

): Promise<string | null> => {

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (config: Record<string, unknown>) => Promise<{ data?: unknown[] }>
  }



  const { data: links } = await query.graph({

    entity: "cart_payment_collection",

    fields: ["cart_id"],

    filters: { payment_collection_id: paymentCollectionId },

  })



  const link = links?.[0] as { cart_id?: string } | undefined



  return link?.cart_id ?? null

}



export const buildGroupDealPaymentSessionContext = async (

  paymentCollectionId: string,

  container: { resolve: <T>(key: string) => T }

): Promise<Record<string, unknown> | undefined> => {

  const cartId = await resolveCartIdByPaymentCollection(

    paymentCollectionId,

    container

  )



  if (!cartId) {

    return undefined

  }



  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (config: Record<string, unknown>) => Promise<{ data?: unknown[] }>
  }



  const { data = [] } = await query.graph({
    entity: "cart",
    fields: ["id", "email", "customer_id", "metadata", "items.metadata"],
    filters: { id: cartId },
  })

  const cart = data[0]



  if (!cart) {

    return undefined

  }



  return resolveGroupDealCartContext(cart as CartLike) ?? undefined

}


