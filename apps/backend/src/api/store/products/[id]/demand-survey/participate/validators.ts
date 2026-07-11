import { z } from "@medusajs/framework/zod"

export const PostStoreDemandSurveyParticipate = z.object({
  participant_id: z.string().min(1),
  email: z.string().email().optional(),
})

export type PostStoreDemandSurveyParticipateType = z.infer<
  typeof PostStoreDemandSurveyParticipate
>
