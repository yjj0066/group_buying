import { z } from "zod"

const selectionSchema = z.object({
  option_id: z.string().min(1),
  quantity: z.number().int().positive(),
})

export const PostStoreJoinGroupDeal = z.object({
  email: z.string().email(),
  country_code: z.string().min(2).max(2),
  quantity: z.number().int().positive().optional(),
  selections: z.array(selectionSchema).optional(),
  cart_id: z.string().optional().nullable(),
})

export type PostStoreJoinGroupDealType = z.infer<typeof PostStoreJoinGroupDeal>

export const PostStoreRegisterGroupDealBillingKey = z.object({
  participant_id: z.string().min(1),
  billing_key: z.string().min(1),
  billing_customer_key: z.string().min(1),
  payment_session_id: z.string().optional().nullable(),
})

export type PostStoreRegisterGroupDealBillingKeyType = z.infer<
  typeof PostStoreRegisterGroupDealBillingKey
>
