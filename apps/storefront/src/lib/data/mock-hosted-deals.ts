import { mapAccountGroupDealToGroupDeal } from "@lib/util/map-account-group-deal"
import type { AccountGroupDeal } from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"

import type { CreateHostedGroupDealInput } from "./account-group-deals"

const GLOBAL_MOCK_HOSTED_DEALS_KEY = "__gb_mock_hosted_deals__"

const getDynamicHostedDealsStore = (): Map<string, AccountGroupDeal> => {
  const globalStore = globalThis as typeof globalThis & {
    [GLOBAL_MOCK_HOSTED_DEALS_KEY]?: Map<string, AccountGroupDeal>
  }

  if (!globalStore[GLOBAL_MOCK_HOSTED_DEALS_KEY]) {
    globalStore[GLOBAL_MOCK_HOSTED_DEALS_KEY] = new Map()
  }

  return globalStore[GLOBAL_MOCK_HOSTED_DEALS_KEY]
}

export const createMockHostedGroupDeal = (
  input: CreateHostedGroupDealInput
): AccountGroupDeal => {
  const dynamicHostedDeals = getDynamicHostedDealsStore()
  const id = `deal-hosted-${Date.now()}`
  const metadata: Record<string, unknown> = {
    original_price: input.original_price,
    deal_price: input.deal_price,
  }

  if (input.member_seats?.length) {
    metadata.member_seats = input.member_seats
  }

  if (input.idol_group) {
    metadata.idol_group = input.idol_group
  }

  if (input.goods_type) {
    metadata.goods_type = input.goods_type
  }

  if (input.description) {
    metadata.description = input.description
  }

  const deal: AccountGroupDeal = {
    id,
    title: input.title,
    status: "recruiting",
    leader_stage: "deposit_pending",
    deposit_status: "pending",
    deposit_amount: null,
    currency_code: input.currency_code,
    current_participants: 0,
    target_quantity: input.target_quantity,
    ends_at: input.ends_at,
    purchase_receipt_status: "pending",
    receipt_ai_status: "not_requested",
    tracking_ai_status: "not_requested",
    report_stage: "not_started",
    dispute_status: "none",
    metadata,
    created_at: new Date().toISOString(),
  }

  dynamicHostedDeals.set(id, deal)

  return deal
}

export const recordMockHostedLeaderDeposit = (
  dealId: string,
  depositAmount: number
): AccountGroupDeal | null => {
  const dynamicHostedDeals = getDynamicHostedDealsStore()
  const existing = dynamicHostedDeals.get(dealId)

  if (!existing) {
    return null
  }

  const updated: AccountGroupDeal = {
    ...existing,
    deposit_status: "deposited",
    deposit_amount: depositAmount,
    leader_stage: "recruiting",
    status: "recruiting",
  }

  dynamicHostedDeals.set(dealId, updated)

  return updated
}

export const getMockHostedAccountDeal = (
  dealId: string
): AccountGroupDeal | null =>
  getDynamicHostedDealsStore().get(dealId) ?? null

export const listMockHostedAccountDeals = (): AccountGroupDeal[] =>
  Array.from(getDynamicHostedDealsStore().values())

export const resolveMockLeaderGroupDealForPage = async (
  dealId: string
): Promise<GroupDeal | null> => {
  const dynamicDeal = getDynamicHostedDealsStore().get(dealId)

  if (!dynamicDeal) {
    return null
  }

  return mapAccountGroupDealToGroupDeal(dynamicDeal)
}
