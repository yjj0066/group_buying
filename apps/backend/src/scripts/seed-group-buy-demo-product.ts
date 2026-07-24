import { ExecArgs } from "@medusajs/framework/types"

import { ensureGroupBuyDemoProduct } from "../utils/ensure-group-buy-demo-product"

/**
 * Ensures the placeholder product used by leader/seller create flows exists.
 * Run: pnpm seed:group-buy-demo-product
 */
export default async function seedGroupBuyDemoProduct({ container }: ExecArgs) {
  await ensureGroupBuyDemoProduct(container)
}
