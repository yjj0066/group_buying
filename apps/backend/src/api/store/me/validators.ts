import { z } from "zod"

export const PutStoreMePreferences = z.object({
  favorite_idol_group: z.string().nullable().optional(),
  favorite_member: z.string().nullable().optional(),
  notify_vacancy: z.boolean().optional(),
  notify_progress: z.boolean().optional(),
})

export type PutStoreMePreferencesType = z.infer<typeof PutStoreMePreferences>

export const PostStoreMePaymentMethod = z.object({
  provider: z.enum(["stripe", "toss"]),
  label: z.string().min(1),
  last4: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})

export type PostStoreMePaymentMethodType = z.infer<
  typeof PostStoreMePaymentMethod
>

export const PostStoreMeLeaderDeposit = z.object({
  deposit_amount: z.number().positive(),
  deposit_payment_key: z.string().min(1),
})

export type PostStoreMeLeaderDepositType = z.infer<
  typeof PostStoreMeLeaderDeposit
>
