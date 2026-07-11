import { z } from "@medusajs/framework/zod"

export const PostStoreJoinGroupDeal = z.object({
  email: z.string().email(),
  quantity: z.number().int().positive().default(1),
})

export type PostStoreJoinGroupDealType = z.infer<
  typeof PostStoreJoinGroupDeal
>
