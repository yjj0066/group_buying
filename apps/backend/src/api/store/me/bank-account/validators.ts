import { z } from "zod"

export const PostStoreMeBankAccount = z.object({
  bank_code: z.string().min(2).max(4),
  bank_name: z.string().min(1),
  account_number: z.string().min(8).max(20),
  account_holder: z.string().min(1),
})

export type PostStoreMeBankAccountType = z.infer<typeof PostStoreMeBankAccount>

export const PostStoreDocumentExtract = z.object({
  kind: z.enum(["purchase_receipt", "shipping_invoice"]),
  image_url: z.string().url(),
  group_deal_id: z.string().optional(),
})

export type PostStoreDocumentExtractType = z.infer<
  typeof PostStoreDocumentExtract
>
