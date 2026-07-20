"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"

export type LeaderShippingRegistrationEntry = {
  participant_id: string
  carrier: string
  tracking_number: string
}

export type ConfirmLeaderShippingResult =
  | {
      ok: true
      notified_count: number
    }
  | {
      ok: false
      error: string
    }

export async function confirmLeaderShipping(
  dealId: string,
  entries: LeaderShippingRegistrationEntry[]
): Promise<ConfirmLeaderShippingResult> {
  try {
    const headers = await getAuthHeaders()

    if ("authorization" in headers && headers.authorization) {
      const response = await sdk.client.fetch<{
        updated_count: number
        notified_count: number
      }>(`/store/me/group-deals/${dealId}/shipping/complete`, {
        method: "POST",
        headers,
        body: { entries },
      })

      revalidateTag("group-deals")

      return {
        ok: true,
        notified_count: response.notified_count ?? entries.length,
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[leader-shipping] Shipping complete API unavailable, accepting stub update.",
        error
      )

      return {
        ok: true,
        notified_count: entries.length,
      }
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "발송 완료 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }

  if (process.env.NODE_ENV === "development") {
    return {
      ok: true,
      notified_count: entries.length,
    }
  }

  return {
    ok: false,
    error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",
  }
}
