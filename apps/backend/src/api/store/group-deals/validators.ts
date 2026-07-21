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

export const PostStoreJoinGroupDealWaitlist = z.object({
  email: z.string().email(),
  quantity: z.number().int().positive().optional(),
  selections: z.array(selectionSchema).optional(),
  priority: z.number().int().nonnegative().optional(),
})

export type PostStoreJoinGroupDealWaitlistType = z.infer<
  typeof PostStoreJoinGroupDealWaitlist
>

export const PostStoreConfirmVirtualAccountDeposit = z.object({
  participant_id: z.string().min(1),
})

export type PostStoreConfirmVirtualAccountDepositType = z.infer<
  typeof PostStoreConfirmVirtualAccountDeposit
>

const optionalOptionId = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional()
)

export const PostStoreApplyGroupDeal = z.object({
  option_id: optionalOptionId,
  member_label: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  recipient_name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  delivery_note: z.string().optional().nullable(),
  country_code: z.string().min(2).max(2).default("kr"),
})

export type PostStoreApplyGroupDealType = z.infer<typeof PostStoreApplyGroupDeal>
