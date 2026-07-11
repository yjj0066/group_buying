import { z } from "@medusajs/framework/zod"
import { GroupDealStatus } from "../../../types/group-buying"

export const PostAdminCreateGroupDeal = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  product_id: z.string().min(1),
  variant_id: z.string().optional().nullable(),
  target_quantity: z.number().int().positive(),
  original_price: z.number().positive(),
  deal_price: z.number().positive(),
  currency_code: z.string().min(3).max(3),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  status: z.nativeEnum(GroupDealStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const PostAdminUpdateGroupDeal = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  target_quantity: z.number().int().positive().optional(),
  original_price: z.number().positive().optional(),
  deal_price: z.number().positive().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  status: z.nativeEnum(GroupDealStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type PostAdminCreateGroupDealType = z.infer<
  typeof PostAdminCreateGroupDeal
>

export type PostAdminUpdateGroupDealType = z.infer<
  typeof PostAdminUpdateGroupDeal
>
