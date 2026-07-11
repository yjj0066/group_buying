"use server"

import { sdk } from "@lib/config"

export type DemandSurveyParticipationResponse = {
  participation_current: number
  participation_target: number
}

export async function participateInDemandSurvey(
  productId: string,
  data: { participant_id: string; email?: string }
) {
  return sdk.client.fetch<DemandSurveyParticipationResponse>(
    `/store/products/${productId}/demand-survey/participate`,
    {
      method: "POST",
      body: data,
    }
  )
}
