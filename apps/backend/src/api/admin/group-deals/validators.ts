import { z } from "@medusajs/framework/zod"
import {
  GroupDealOptionType,
  GroupDealPaymentPhaseMode,
  GroupDealReceiptStatus,
  GroupDealStatus,
} from "../../../types/group-buying"

export const AdminGroupDealOptionSchema = z.object({
  option_type: z.nativeEnum(GroupDealOptionType).default(GroupDealOptionType.MEMBER),
  option_key: z.string().min(1),
  label: z.string().min(1),
  deal_price: z.number().positive().optional().nullable(),
  original_price: z.number().positive().optional().nullable(),
  max_quantity: z.number().int().positive().optional().nullable(),
  target_quantity: z.number().int().positive().optional().nullable(),
  sort_order: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const PostAdminCreateGroupDeal = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  product_id: z.string().min(1),
  variant_id: z.string().optional().nullable(),
  min_participants: z.number().int().positive(),
  target_quantity: z.number().int().positive(),
  max_quantity: z.number().int().positive().optional().nullable(),
  original_price: z.number().positive(),
  deal_price: z.number().positive(),
  currency_code: z.string().min(3).max(3),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  status: z.nativeEnum(GroupDealStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  payment_phase_mode: z
    .nativeEnum(GroupDealPaymentPhaseMode)
    .optional()
    .default(GroupDealPaymentPhaseMode.SINGLE),
  estimated_shipping_fee: z.number().positive().optional().nullable(),
  shipping_fee_note: z.string().optional().nullable(),
  options: z.array(AdminGroupDealOptionSchema).optional(),
})

export const PostAdminUpdateGroupDeal = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  min_participants: z.number().int().positive().optional(),
  target_quantity: z.number().int().positive().optional(),
  max_quantity: z.number().int().positive().optional().nullable(),
  original_price: z.number().positive().optional(),
  deal_price: z.number().positive().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  status: z.nativeEnum(GroupDealStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  estimated_shipping_fee: z.number().positive().optional().nullable(),
  shipping_fee_note: z.string().optional().nullable(),
})

export const PostAdminQuoteGroupDealShipping = z.object({
  estimated_shipping_fee: z.number().positive(),
  shipping_fee_note: z.string().optional().nullable(),
})

export type PostAdminCreateGroupDealType = z.infer<
  typeof PostAdminCreateGroupDeal
>

export type PostAdminUpdateGroupDealType = z.infer<
  typeof PostAdminUpdateGroupDeal
>

export type PostAdminQuoteGroupDealShippingType = z.infer<
  typeof PostAdminQuoteGroupDealShipping
>

export const PostAdminCancelGroupDeal = z.object({
  reason: z.string().optional().nullable(),
})

export type PostAdminCancelGroupDealType = z.infer<
  typeof PostAdminCancelGroupDeal
>

export const PostAdminGroupDealReceipt = z
  .object({
    image_base64: z.string().min(1).optional(),
    image_url: z.string().url().optional(),
    filename: z.string().optional(),
    status: z.nativeEnum(GroupDealReceiptStatus).optional(),
    note: z.string().optional().nullable(),
  })
  .refine(
    (value) => Boolean(value.image_base64 || value.image_url || value.status),
    {
      message: "Provide image_base64, image_url, or status",
    }
  )

export type PostAdminGroupDealReceiptType = z.infer<
  typeof PostAdminGroupDealReceipt
>

export const PostAdminGroupDealTracking = z.object({
  entries: z
    .array(
      z.object({
        participant_id: z.string().min(1),
        tracking_number: z.string().min(1),
        carrier: z.string().optional().nullable(),
      })
    )
    .min(1),
})

export type PostAdminGroupDealTrackingType = z.infer<
  typeof PostAdminGroupDealTracking
>
