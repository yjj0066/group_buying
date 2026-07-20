"use server"

import {
  getFlaskSearchApiUrl,
  getFlaskRequestTimeoutMs,
  isFlaskSearchEnabled,
} from "@lib/config/flask-search"
import type {
  FlaskAddToCartEvent,
  FlaskBehaviorEvent,
  FlaskGroupBuyPaymentCompleteEvent,
  FlaskSearchClickEvent,
} from "types/flask-behavior-log"

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutMs = getFlaskRequestTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const postJson = async (url: string, body: unknown): Promise<void> => {
  await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
}

export const forwardFlaskBehaviorEvent = async (
  event: FlaskBehaviorEvent
): Promise<void> => {
  if (!isFlaskSearchEnabled()) {
    return
  }

  const baseUrl = getFlaskSearchApiUrl()

  if (!baseUrl) {
    return
  }

  const payload = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  }

  try {
    if (event.event_type === "search_click") {
      const searchEvent = payload as FlaskSearchClickEvent
      await postJson(`${baseUrl}/api/v1/products/search/click`, {
        query: searchEvent.query,
        medusa_product_id: searchEvent.medusa_product_id,
        position: searchEvent.position,
        customer_id: searchEvent.customer_id ?? null,
      })
      return
    }

    await postJson(`${baseUrl}/api/v1/events`, payload)
  } catch {
    // Non-blocking — never propagate to commerce flows
  }
}

export const forwardFlaskSearchClick = async (
  event: Omit<FlaskSearchClickEvent, "event_type" | "timestamp">
): Promise<void> => {
  await forwardFlaskBehaviorEvent({
    event_type: "search_click",
    ...event,
  })
}

export const forwardFlaskAddToCart = async (
  event: Omit<FlaskAddToCartEvent, "event_type" | "timestamp">
): Promise<void> => {
  await forwardFlaskBehaviorEvent({
    event_type: "add_to_cart",
    ...event,
  })
}

export const forwardFlaskGroupBuyPaymentComplete = async (
  event: Omit<FlaskGroupBuyPaymentCompleteEvent, "event_type" | "timestamp">
): Promise<void> => {
  await forwardFlaskBehaviorEvent({
    event_type: "group_buy_payment_complete",
    ...event,
  })
}
