"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { resolveMedusaErrorMessage } from "@lib/util/medusa-error"
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

const SHIPPING_COMPLETE_FALLBACK =
  "발송 확정 처리에 실패했습니다. 백엔드 터미널 로그를 확인하고, Admin에서 구매 영수증 검증(Verify Receipt)이 완료되었는지 확인해 주세요."

const resolveShippingCompleteError = (error: unknown): string => {
  const message = resolveMedusaErrorMessage(error)

  if (
    message === "An unknown error occurred." ||
    message.startsWith("서버 요청 처리에 실패했습니다")
  ) {
    return SHIPPING_COMPLETE_FALLBACK
  }

  return message
}

export async function confirmLeaderShipping(
  dealId: string,
  entries: LeaderShippingRegistrationEntry[]
): Promise<ConfirmLeaderShippingResult> {
  if (!entries.length) {
    return {
      ok: false,
      error: "등록할 운송장 정보가 없습니다.",
    }
  }

  try {
    const headers = await getAuthHeaders()

    if (!("authorization" in headers) || !headers.authorization) {
      return {
        ok: false,
        error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",
      }
    }

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
      notified_count: response.notified_count ?? response.updated_count ?? entries.length,
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[leader-shipping] Shipping complete request failed.", error)
    }

    return {
      ok: false,
      error: resolveShippingCompleteError(error),
    }
  }
}
