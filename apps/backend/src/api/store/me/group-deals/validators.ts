import { z } from "@medusajs/framework/zod"

export const PostStoreCreateGroupDeal = z.object({
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
  /** CRTE-03: 선언 앨범 구매 수량 (미입력 시 target_quantity 사용) */
  declared_album_quantity: z.number().int().positive().optional(),
  /** CRTE-01: 1차 판매처 */
  primary_seller: z.string().min(1).optional().nullable(),
  /** CRTE-01: 예상 발송일 */
  expected_ship_date: z.string().datetime().optional().nullable(),
  member_seats: z
    .array(
      z.object({
        label: z.string().min(1),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
  idol_group: z.string().min(1).optional().nullable(),
  goods_type: z.string().min(1).optional().nullable(),
  image_base64: z.string().min(1).optional(),
  image_filename: z.string().optional(),
})

export type PostStoreCreateGroupDealType = z.infer<
  typeof PostStoreCreateGroupDeal
>

export const PostStoreMeGroupDealDocumentParse = z.object({
  image_base64: z.string().min(1),
  filename: z.string().optional(),
})

export type PostStoreMeGroupDealDocumentParseType = z.infer<
  typeof PostStoreMeGroupDealDocumentParse
>

export const PostStoreMeGroupDealShippingComplete = z.object({
  entries: z
    .array(
      z.object({
        participant_id: z.string().min(1),
        carrier: z.string().min(1),
        tracking_number: z.string().min(1),
      })
    )
    .min(1),
})

export type PostStoreMeGroupDealShippingCompleteType = z.infer<
  typeof PostStoreMeGroupDealShippingComplete
>

export const PostStoreMeGroupDealReceiptConfirm = z.object({
  order_number: z.string().min(1),
  seller: z.string().optional().nullable(),
  ordered_at: z.string().optional().nullable(),
  album_quantity: z.number().int().positive(),
  total_amount: z.number().positive().optional().nullable(),
})

export type PostStoreMeGroupDealReceiptConfirmType = z.infer<
  typeof PostStoreMeGroupDealReceiptConfirm
>

export const PostStoreMeGroupDealSettlement = z.object({
  bank_code: z.string().min(1),
  bank_name: z.string().min(1),
  account_number: z.string().min(1),
  account_holder: z.string().min(1),
})

export type PostStoreMeGroupDealSettlementType = z.infer<
  typeof PostStoreMeGroupDealSettlement
>
