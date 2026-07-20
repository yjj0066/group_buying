import type {
  FlaskAddToCartEvent,
  FlaskGroupBuyPaymentCompleteEvent,
  FlaskSearchClickEvent,
} from "types/flask-behavior-log"

const sendBehaviorEvent = (event: Record<string, unknown>): void => {
  void fetch("/api/ai/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
    }),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // Swallow — analytics must never block UX
  })
}

export const trackSearchResultClick = (
  payload: Omit<FlaskSearchClickEvent, "event_type" | "timestamp">
): void => {
  sendBehaviorEvent({
    event_type: "search_click",
    ...payload,
  })
}

export const trackAddToCart = (
  payload: Omit<FlaskAddToCartEvent, "event_type" | "timestamp">
): void => {
  sendBehaviorEvent({
    event_type: "add_to_cart",
    ...payload,
  })
}

export const trackGroupBuyPaymentComplete = (
  payload: Omit<FlaskGroupBuyPaymentCompleteEvent, "event_type" | "timestamp">
): void => {
  sendBehaviorEvent({
    event_type: "group_buy_payment_complete",
    ...payload,
  })
}
