import type { GroupDeal, GroupDealOption } from "types/group-deal"

const normalizeOption = (option: GroupDealOption): GroupDealOption => {
  const maxQuantity = option.max_quantity ?? option.target_quantity
  const currentQuantity = option.current_quantity ?? 0
  const remaining =
    option.remaining_quantity ??
    (maxQuantity != null ? Math.max(0, maxQuantity - currentQuantity) : null)

  return {
    ...option,
    deal_price: option.deal_price ?? 0,
    original_price: option.original_price ?? option.deal_price ?? 0,
    remaining_quantity: remaining,
  }
}

const inferIdolGroup = (
  title: string,
  metadata: Record<string, unknown>
): string | undefined => {
  const existing = metadata.idol_group

  if (typeof existing === "string" && existing.trim()) {
    return existing.trim()
  }

  const firstToken = title.trim().split(/\s+/)[0]

  if (!firstToken) {
    return undefined
  }

  return firstToken
}

export const normalizeGroupDealFromApi = (deal: GroupDeal): GroupDeal => {
  const metadata = { ...(deal.metadata ?? {}) }
  const idolGroup = inferIdolGroup(deal.title, metadata)

  if (idolGroup) {
    metadata.idol_group = idolGroup
  }

  return {
    ...deal,
    metadata,
    options: (deal.options ?? []).map(normalizeOption),
  }
}

export const isStoreVisibleDeal = (deal: GroupDeal): boolean => {
  const metadata = deal.metadata ?? {}
  const depositOk =
    deal.deposit_status === "deposited" || deal.deposit_status === "secured"
  const adminCreated =
    metadata.admin_created === true || metadata.source === "admin"
  const legacyAdminOpen =
    deal.status === "open" &&
    !deal.leader_customer_id &&
    deal.deposit_status !== "refunded"

  return depositOk || adminCreated || legacyAdminOpen
}
