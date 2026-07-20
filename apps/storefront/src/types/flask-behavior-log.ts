export type FlaskBehaviorEventType =
  | "search_click"
  | "add_to_cart"
  | "group_buy_payment_complete"

export type FlaskBehaviorEventBase = {
  event_type: FlaskBehaviorEventType
  timestamp?: string
  customer_id?: string | null
}

export type FlaskSearchClickEvent = FlaskBehaviorEventBase & {
  event_type: "search_click"
  query: string
  medusa_product_id: string
  position?: number
}

export type FlaskAddToCartEvent = FlaskBehaviorEventBase & {
  event_type: "add_to_cart"
  medusa_product_id: string
  variant_id: string
  quantity: number
  country_code?: string
}

export type FlaskGroupBuyPaymentCompleteEvent = FlaskBehaviorEventBase & {
  event_type: "group_buy_payment_complete"
  group_deal_id?: string
  participant_id?: string
  medusa_product_id?: string
  order_id?: string
  payment_method?: "virtual_account" | "billing_reservation" | "card" | string
  amount?: number
  currency_code?: string
}

export type FlaskBehaviorEvent =
  | FlaskSearchClickEvent
  | FlaskAddToCartEvent
  | FlaskGroupBuyPaymentCompleteEvent
