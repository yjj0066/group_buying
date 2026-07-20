"use client"

import { submitParticipationDispute } from "@lib/data/account-group-deals"
import { registerDisputeSettlementHold } from "@lib/data/dispute-settlement-hold"

export type SubmitSupportDisputeInput = {
  dealId: string
  dealTitle?: string | null
  participantId?: string | null
  transactionId?: string | null
  reason: string
  details?: string | null
}

export type SubmitSupportDisputeResult = {
  settlementHold: true
  viaApi: boolean
  createdAt: string
}

export async function submitSupportDispute(
  input: SubmitSupportDisputeInput
): Promise<SubmitSupportDisputeResult> {
  let viaApi = false

  if (input.participantId) {
    try {
      await submitParticipationDispute(input.participantId, {
        reason: input.reason,
        details: input.details ?? undefined,
      })
      viaApi = true
    } catch {
      // fall through to sessionStorage mock
    }
  }

  const record = registerDisputeSettlementHold(input)

  return {
    settlementHold: true,
    viaApi,
    createdAt: record.createdAt,
  }
}
