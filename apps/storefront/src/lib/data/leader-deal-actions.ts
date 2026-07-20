"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

type ActionResult = {
  ok: boolean
  error?: string
}

export async function closeLeaderDealRecruitment(
  dealId: string
): Promise<ActionResult> {
  try {
    const headers = await getAuthHeaders()

    if ("authorization" in headers && headers.authorization) {
      await sdk.client.fetch(`/store/me/group-deals/${dealId}/close-recruitment`, {
        method: "POST",
        headers,
      })

      return { ok: true }
    }
  } catch {
    // mock fallback until API is live
  }

  await new Promise((resolve) => setTimeout(resolve, 300))
  return { ok: true }
}

export async function cancelLeaderGroupDeal(dealId: string): Promise<ActionResult> {
  try {
    const headers = await getAuthHeaders()

    if ("authorization" in headers && headers.authorization) {
      await sdk.client.fetch(`/store/me/group-deals/${dealId}/cancel`, {
        method: "POST",
        headers,
      })

      return { ok: true }
    }
  } catch {
    // mock fallback until API is live
  }

  await new Promise((resolve) => setTimeout(resolve, 300))
  void dealId
  return { ok: true }
}
