import { z } from "@medusajs/framework/zod"

export const PostStoreJoinGroupDeal = z.object({
  email: z.string().email(),
  quantity: z.number().int().positive().default(1),
  country_code: z.string().min(2).max(2),
  cart_id: z.string().optional().nullable(),
})

export type PostStoreJoinGroupDealType = z.infer<
  typeof PostStoreJoinGroupDeal
>
