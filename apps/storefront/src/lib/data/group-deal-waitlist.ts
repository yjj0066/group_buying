"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { isMockFallbackEnabled } from "@lib/util/persistence-policy"

export type JoinGroupDealWaitlistInput = {
  email: string
  quantity?: number
  selections?: Array<{ option_id: string; quantity: number }>
}

export async function joinGroupDealWaitlist(
  dealId: string,
  input: JoinGroupDealWaitlistInput
): Promise<void> {
  try {
    const headers = await getAuthHeaders()

    await sdk.client.fetch(`/store/group-deals/${dealId}/waitlist`, {
      method: "POST",
      body: {
        email: input.email,
        quantity: input.quantity ?? 1,
        selections: input.selections,
      },
      headers,
    })
  } catch (error) {
    if (isMockFallbackEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      return
    }

    throw error
  }
}
