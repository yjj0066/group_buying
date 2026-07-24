import { MedusaContainer } from "@medusajs/framework"

import { ensureGroupBuyDemoProduct } from "../utils/ensure-group-buy-demo-product"

export default async function ensure_group_buy_demo_product({
  container,
}: {
  container: MedusaContainer
}) {
  await ensureGroupBuyDemoProduct(container)
}
