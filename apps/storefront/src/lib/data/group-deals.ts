import { sdk } from "@lib/config"
import {
  GROUP_BUYING_PLATFORM_FEE,
  GROUP_BUYING_SHIPPING_FEE,
} from "@lib/constants/group-buying-fees"
import { listProducts } from "@lib/data/products"
import { retrieveCustomer } from "@lib/data/customer"
import {
  normalizeGroupDealFromApi,
} from "@lib/util/normalize-group-deal"
import { mapAccountGroupDealToGroupDeal } from "@lib/util/map-account-group-deal"
import { resolveCountryCode } from "@lib/util/country-code"
import { enrichGroupDealsWithProducts } from "@lib/util/product-group-deal"
import type {
  GroupDeal,
  GroupDealParticipation,
  VirtualAccountInfo,
} from "types/group-deal"
import { createMemberOption } from "types/group-deal"

const now = Date.now()
const hoursFromNow = (hours: number) =>
  new Date(now + hours * 60 * 60 * 1000).toISOString()
const daysFromNow = (days: number) =>
  new Date(now + days * 24 * 60 * 60 * 1000).toISOString()
const daysAgo = (days: number) =>
  new Date(now - days * 24 * 60 * 60 * 1000).toISOString()

const baseDeal = (
  partial: Partial<GroupDeal> & Pick<GroupDeal, "id" | "title">
): GroupDeal => {
  const startsAt = partial.starts_at ?? daysAgo(3)
  const createdAt = partial.created_at ?? startsAt

  return {
    description: null,
    product_id: `demo-product-${partial.id}`,
    variant_id: null,
    min_participants: 9,
    current_participants: 4,
    target_quantity: 9,
    current_quantity: 4,
    max_quantity: null,
    original_price: 45000,
    deal_price: 38000,
    currency_code: "krw",
    status: "open",
    starts_at: startsAt,
    ends_at: daysFromNow(2),
    metadata: {},
    leader_customer_id: null,
    leader_role_number: 13,
    is_first_time_leader: false,
    leader_completed_deals: 12,
    leader_trust_score: 82,
    deposit_status: "deposited",
    deposit_amount: 50000,
    purchase_receipt_status: "pending",
    is_urgent_fill: false,
    options: [],
    created_at: createdAt,
    updated_at: new Date().toISOString(),
    ...partial,
  }
}

// TODO: Replace mock catalog with GET /store/group-deals when backend is available
export const MOCK_GROUP_DEALS: GroupDeal[] = [
  baseDeal({
    id: "deal-twice-season-greetings",
    title: "TWICE 2026 SEASON'S GREETINGS",
    description: "멤버별 분철 · 총대 보증금 예치 완료",
    original_price: 45000,
    deal_price: 38000,
    ends_at: daysFromNow(2),
    options: [
      createMemberOption("deal-twice-season-greetings", "opt-nayeon", "나연", 38000, 45000, 1, 1, 0),
      createMemberOption("deal-twice-season-greetings", "opt-jeongyeon", "정연", 38000, 45000, 1, 0, 1),
      createMemberOption("deal-twice-season-greetings", "opt-momo", "모모", 38000, 45000, 1, 1, 2),
      createMemberOption("deal-twice-season-greetings", "opt-sana", "사나", 38000, 45000, 1, 0, 3),
      createMemberOption("deal-twice-season-greetings", "opt-jihyo", "지효", 38000, 45000, 1, 1, 4),
      createMemberOption("deal-twice-season-greetings", "opt-mina", "미나", 38000, 45000, 1, 0, 5),
    ],
    metadata: { idol_group: "TWICE", goods_type: "season-greeting" },
  }),
  baseDeal({
    id: "deal-newjeans-bunjang",
    title: "NewJeans Bunnies Camp MD 분철",
    description: "급구 공석 · 마감 18시간 전",
    original_price: 32000,
    deal_price: 28000,
    ends_at: hoursFromNow(18),
    is_urgent_fill: true,
    leader_completed_deals: 8,
    leader_trust_score: 78,
    options: [
      createMemberOption("deal-newjeans-bunjang", "opt-minji", "민지", 28000, 32000, 1, 0, 0),
      createMemberOption("deal-newjeans-bunjang", "opt-hanni", "하니", 28000, 32000, 1, 1, 1),
      createMemberOption("deal-newjeans-bunjang", "opt-danielle", "다니엘", 28000, 32000, 1, 0, 2),
      createMemberOption("deal-newjeans-bunjang", "opt-haerin", "해린", 28000, 32000, 1, 1, 3),
      createMemberOption("deal-newjeans-bunjang", "opt-hyein", "혜인", 28000, 32000, 1, 0, 4),
    ],
    metadata: { idol_group: "NewJeans", goods_type: "md" },
  }),
  baseDeal({
    id: "deal-ive-photo",
    title: "IVE WAVE 포토카드 세트 분철",
    description: "마감 임박 · 1석 남음",
    original_price: 28000,
    deal_price: 24000,
    ends_at: hoursFromNow(8),
    is_urgent_fill: true,
    options: [
      createMemberOption("deal-ive-photo", "opt-yujin", "유진", 24000, 28000, 1, 1, 0),
      createMemberOption("deal-ive-photo", "opt-wonyoung", "원영", 24000, 28000, 1, 1, 1),
      createMemberOption("deal-ive-photo", "opt-rei", "레이", 24000, 28000, 1, 1, 2),
      createMemberOption("deal-ive-photo", "opt-liz", "리즈", 24000, 28000, 1, 0, 3),
      createMemberOption("deal-ive-photo", "opt-leeseo", "이서", 24000, 28000, 1, 1, 4),
      createMemberOption("deal-ive-photo", "opt-gaeul", "가을", 24000, 28000, 1, 1, 5),
    ],
    metadata: { idol_group: "IVE", goods_type: "photocard" },
  }),
  baseDeal({
    id: "deal-aespa-album",
    title: "aespa Whiplash 앨범 분철",
    description: "인기 공구 · 실버 등급 총대",
    original_price: 22000,
    deal_price: 18500,
    ends_at: daysFromNow(5),
    leader_completed_deals: 15,
    leader_trust_score: 85,
    options: [
      createMemberOption("deal-aespa-album", "opt-karina", "카리나", 18500, 22000, 1, 0, 0),
      createMemberOption("deal-aespa-album", "opt-winter", "윈터", 18500, 22000, 1, 0, 1),
      createMemberOption("deal-aespa-album", "opt-ningning", "닝닝", 18500, 22000, 1, 1, 2),
      createMemberOption("deal-aespa-album", "opt-giselle", "지젤", 18500, 22000, 1, 0, 3),
    ],
    metadata: { idol_group: "aespa", goods_type: "album" },
  }),
  baseDeal({
    id: "deal-le-sserafim-photobook",
    title: "LE SSERAFIM 포토북 분철",
    description: "전 자리 마감 (대기등록 가능)",
    original_price: 52000,
    deal_price: 44000,
    ends_at: daysFromNow(1),
    options: [
      createMemberOption("deal-le-sserafim-photobook", "opt-sakura", "사쿠라", 44000, 52000, 1, 1, 0),
      createMemberOption("deal-le-sserafim-photobook", "opt-chaewon", "채원", 44000, 52000, 1, 1, 1),
      createMemberOption("deal-le-sserafim-photobook", "opt-yunjin", "윤진", 44000, 52000, 1, 1, 2),
      createMemberOption("deal-le-sserafim-photobook", "opt-kazuha", "카즈하", 44000, 52000, 1, 1, 3),
      createMemberOption("deal-le-sserafim-photobook", "opt-eunchae", "은채", 44000, 52000, 1, 1, 4),
    ],
    metadata: { idol_group: "LE SSERAFIM", goods_type: "photobook" },
  }),
  baseDeal({
    id: "deal-illit-closed",
    title: "ILLIT SUPER REAL ME 앨범 분철",
    description: "모집 마감 · 대기등록만 가능",
    status: "closed",
    ends_at: daysAgo(3),
    options: [
      createMemberOption("deal-illit-closed", "opt-yunah", "윤아", 21000, 25000, 1, 1, 0),
      createMemberOption("deal-illit-closed", "opt-minju", "민주", 21000, 25000, 1, 1, 1),
      createMemberOption("deal-illit-closed", "opt-moka", "모카", 21000, 25000, 1, 1, 2),
      createMemberOption("deal-illit-closed", "opt-wonhee", "원희", 21000, 25000, 1, 1, 3),
      createMemberOption("deal-illit-closed", "opt-iroha", "이로하", 21000, 25000, 1, 1, 4),
    ],
    metadata: { idol_group: "ILLIT", goods_type: "album" },
  }),
]

export const MOCK_HOSTED_DEALS: GroupDeal[] = [
  baseDeal({
    id: "deal-hosted-twice",
    title: "TWICE 2026 SEASON'S GREETINGS (내 공구)",
    description: "모집 중 · 4/9석 확정",
    status: "recruiting",
    total_seats: 9,
    filled_seats: 4,
    options: [
      createMemberOption("deal-hosted-twice", "opt-nayeon", "나연", 38000, 45000, 1, 1, 0),
      createMemberOption("deal-hosted-twice", "opt-jeongyeon", "정연", 38000, 45000, 1, 0, 1),
      createMemberOption("deal-hosted-twice", "opt-momo", "모모", 38000, 45000, 1, 0, 2),
      createMemberOption("deal-hosted-twice", "opt-sana", "사나", 38000, 45000, 1, 0, 3),
      createMemberOption("deal-hosted-twice", "opt-jihyo", "지효", 38000, 45000, 1, 1, 4),
      createMemberOption("deal-hosted-twice", "opt-mina", "미나", 38000, 45000, 1, 0, 5),
    ],
    metadata: { idol_group: "TWICE", goods_type: "season-greeting", hosted: true },
  }),
  baseDeal({
    id: "deal-hosted-aespa",
    title: "aespa Whiplash (내 공구 · 구매 단계)",
    description: "1차 구매 영수증 업로드 필요",
    status: "purchase",
    current_participants: 4,
    current_quantity: 4,
    options: [
      createMemberOption("deal-hosted-aespa", "opt-karina", "카리나", 18500, 22000, 1, 1, 0),
      createMemberOption("deal-hosted-aespa", "opt-winter", "윈터", 18500, 22000, 1, 1, 1),
      createMemberOption("deal-hosted-aespa", "opt-ningning", "닝닝", 18500, 22000, 1, 1, 2),
      createMemberOption("deal-hosted-aespa", "opt-giselle", "지젤", 18500, 22000, 1, 1, 3),
    ],
    metadata: {
      idol_group: "aespa",
      goods_type: "album",
      hosted: true,
      declared_album_quantity: 5,
      primary_seller: "Weverse Shop",
    },
  }),
]

export const DEFAULT_FAVORITE_MEMBER = "민지"

const allMockDeals = () =>
  [...MOCK_GROUP_DEALS, ...MOCK_HOSTED_DEALS].map((deal) => ({ ...deal }))

const hydrateGroupDealImages = async (
  deals: GroupDeal[],
  countryCode?: string
): Promise<GroupDeal[]> => {
  const productIds = [
    ...new Set(
      deals
        .map((deal) => deal.product_id)
        .filter(
          (productId): productId is string =>
            Boolean(productId && !productId.startsWith("demo-"))
        )
    ),
  ]

  if (!productIds.length) {
    return deals
  }

  try {
    const { response } = await listProducts({
      countryCode: resolveCountryCode(
        countryCode ?? process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "kr"
      ),
      queryParams: {
        id: productIds,
        fields: "+thumbnail,+images,+metadata",
        limit: productIds.length,
      },
    })

    return enrichGroupDealsWithProducts(deals, response.products)
  } catch {
    return deals
  }
}

export const listGroupDeals = async (options?: {
  countryCode?: string
}): Promise<{ group_deals: GroupDeal[] }> => {
  try {
    const response = await sdk.client.fetch<{ group_deals: GroupDeal[] }>(
      "/store/group-deals",
      {
        method: "GET",
        cache: "no-store",
        next: { tags: ["group-deals"] },
      }
    )

    const groupDeals = (response.group_deals ?? []).map(normalizeGroupDealFromApi)

    return {
      group_deals: await hydrateGroupDealImages(groupDeals, options?.countryCode),
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[group-deals] Store API unavailable, using mock catalog.", error)
    }
  }

  return { group_deals: MOCK_GROUP_DEALS.map((deal) => ({ ...deal })) }
}

export const retrieveGroupDeal = async (
  id: string
): Promise<{ group_deal: GroupDeal }> => {
  try {
    const response = await sdk.client.fetch<{ group_deal: GroupDeal }>(
      `/store/group-deals/${id}`,
      {
        method: "GET",
        cache: "no-store",
        next: { tags: ["group-deals"] },
      }
    )

    if (response.group_deal) {
      return { group_deal: normalizeGroupDealFromApi(response.group_deal) }
    }
  } catch {
    // fall back to mock
  }

  const deal = allMockDeals().find((item) => item.id === id)

  if (!deal) {
    throw new Error(`Group deal ${id} not found`)
  }

  return { group_deal: deal }
}

export const findGroupDealByProductId = async (
  productId: string
): Promise<GroupDeal | null> => {
  try {
    const { group_deals } = await listGroupDeals()
    const match = group_deals.find((deal) => deal.product_id === productId)

    if (match) {
      return match
    }
  } catch {
    // fall back below
  }

  return (
    allMockDeals().find((deal) => deal.product_id === productId) ?? null
  )
}

export const listMockGroupDeals = async (): Promise<GroupDeal[]> =>
  (await listGroupDeals()).group_deals

export const listMockHostedDeals = async (): Promise<GroupDeal[]> =>
  MOCK_HOSTED_DEALS.map((deal) => ({ ...deal }))

export const getStoreGroupDeal = async (
  dealId: string
): Promise<GroupDeal | null> => {
  try {
    const { group_deal } = await retrieveGroupDeal(dealId)
    return group_deal
  } catch {
    return null
  }
}

/** @deprecated Use getStoreGroupDeal */
export const getMockGroupDeal = getStoreGroupDeal

export const loadHomeDashboardData = async () => {
  const [dealsResult, customer] = await Promise.all([
    listGroupDeals(),
    retrieveCustomer(),
  ])

  let hostedDeals: GroupDeal[]

  if (customer) {
    const { listHostedGroupDeals } = await import("@lib/data/account-group-deals")
    const accountDeals = await listHostedGroupDeals()
    hostedDeals = accountDeals.map(mapAccountGroupDealToGroupDeal)
  } else {
    hostedDeals = await listMockHostedDeals()
  }

  return { deals: dealsResult.group_deals, hostedDeals }
}

export const createMockVirtualAccount = (
  deal: GroupDeal,
  amount: number
): VirtualAccountInfo => ({
  bank_name: "카카오뱅크",
  account_number: "3333-01-1234567",
  account_holder: "아이돌공구(주)",
  amount,
  currency_code: deal.currency_code,
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
})

export const createMockParticipation = (
  dealId: string,
  optionId: string,
  memberLabel: string,
  deal: GroupDeal,
  unitPrice: number
): GroupDealParticipation => ({
  id: `part-${Date.now()}`,
  deal_id: dealId,
  option_id: optionId,
  member_label: memberLabel,
  status: "pending_deposit",
  virtual_account: createMockVirtualAccount(deal, unitPrice),
})

export const getProductGroupDealIndex = async (): Promise<Map<string, string>> => {
  const { group_deals } = await listGroupDeals()
  const index = new Map<string, string>()

  for (const deal of group_deals) {
    if (deal.product_id) {
      index.set(deal.product_id, deal.id)
    }
  }

  return index
}

export const startGroupDealCheckout = async (
  dealId: string,
  input: {
    email: string
    quantity: number
    countryCode: string
    selections?: Array<{ option_id: string; quantity: number }>
  }
): Promise<{
  participant: GroupDealParticipation
  virtual_account?: VirtualAccountInfo | null
  checkout_path: string
}> => {
  try {
    const response = await sdk.client.fetch<{
      participant: GroupDealParticipation
      virtual_account?: VirtualAccountInfo | null
      checkout_path: string
    }>(`/store/group-deals/${dealId}/checkout`, {
      method: "POST",
      body: input,
    })

    if (response.participant) {
      return response
    }
  } catch {
    // mock fallback
  }

  const { group_deal: deal } = await retrieveGroupDeal(dealId)
  const selection = input.selections?.[0]
  const option = deal.options?.find((item) => item.id === selection?.option_id)
  const unitPrice = option?.deal_price ?? deal.deal_price
  const participation = createMockParticipation(
    dealId,
    selection?.option_id ?? "default",
    option?.label ?? "member",
    deal,
    unitPrice * input.quantity
  )

  return {
    participant: participation,
    virtual_account: participation.virtual_account,
    checkout_path: `/deals/${dealId}/deposit?participantId=${participation.id}`,
  }
}
