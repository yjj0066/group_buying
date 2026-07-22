import { listGroupDeals } from "@lib/data/group-deals"
import { resolveMediaUrl } from "@lib/util/product-group-deal"
import type { GroupDeal } from "types/group-deal"
import type {
  LandingDealCard,
  LandingDealCategory,
  LandingHomeData,
} from "types/landing-deal"

const CATEGORY_IMAGES: Record<LandingDealCategory, string> = {
  albums: "/images/placeholders/albums.svg",
  lightsticks: "/images/placeholders/lightsticks.svg",
  photocards: "/images/placeholders/photocards.svg",
  dolls: "/images/placeholders/dolls.svg",
  clothing: "/images/placeholders/clothing.svg",
  accessories: "/images/placeholders/accessories.svg",
}

const resolveCategory = (
  deal: GroupDeal
): LandingDealCategory => {
  const goodsType = String(deal.metadata?.goods_type ?? "").toLowerCase()

  if (goodsType.includes("lightstick")) return "lightsticks"
  if (goodsType.includes("photocard")) return "photocards"
  if (goodsType.includes("doll")) return "dolls"
  if (goodsType.includes("cloth")) return "clothing"
  if (goodsType.includes("access")) return "accessories"

  return "albums"
}

export const getGroupDealFallbackImageUrl = (deal: GroupDeal): string => {
  const category = resolveCategory(deal)

  return CATEGORY_IMAGES[category]
}

const resolveGroupName = (deal: GroupDeal) => {
  if (deal.metadata?.idol_group) {
    return String(deal.metadata.idol_group)
  }

  const memberOption = deal.options?.find(
    (option) => option.option_type === "member"
  )

  return memberOption?.label ?? "K-POP"
}

const landingDealHref = (id: string) => `/group-buying/${id}`

const CATEGORY_TO_GOODS_TYPE: Record<LandingDealCategory, string> = {
  albums: "album",
  lightsticks: "lightstick",
  photocards: "photocard",
  dolls: "doll",
  clothing: "clothing",
  accessories: "accessory",
}

const withLandingHref = (
  card: Omit<LandingDealCard, "href">
): LandingDealCard => ({
  ...card,
  href: landingDealHref(card.id),
})

export const mapLandingCardToGroupDeal = (
  card: LandingDealCard
): GroupDeal => {
  const now = new Date().toISOString()
  const startsAt = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 2
  ).toISOString()

  return {
    id: card.id,
    title: card.title,
    description: `${card.groupName} ${card.title}`,
    product_id: `demo-product-${card.id}`,
    variant_id: null,
    min_participants: card.targetParticipants,
    current_participants: card.currentParticipants,
    target_quantity: card.targetParticipants,
    current_quantity: card.currentParticipants,
    max_quantity: null,
    original_price: card.originalPrice,
    deal_price: card.currentPrice,
    currency_code: card.currencyCode,
    status: "open",
    starts_at: startsAt,
    ends_at: card.endsAt,
    metadata: {
      is_demo: true,
      idol_group: card.groupName,
      goods_type: CATEGORY_TO_GOODS_TYPE[card.category],
      target_price: card.targetPrice,
      image_url: card.imageUrl,
    },
    leader_customer_id: null,
    deposit_status: "deposited",
    deposit_amount: 50000,
    purchase_receipt_status: "pending",
    options: [
      {
        id: `${card.id}-member-a`,
        group_deal_id: card.id,
        option_type: "member",
        option_key: "member-a",
        label: `${card.groupName} A`,
        deal_price: card.currentPrice,
        original_price: card.originalPrice,
        max_quantity: Math.ceil(card.targetParticipants / 3),
        target_quantity: null,
        current_quantity: Math.floor(card.currentParticipants / 3),
        sort_order: 0,
        is_active: true,
        metadata: null,
      },
      {
        id: `${card.id}-member-b`,
        group_deal_id: card.id,
        option_type: "member",
        option_key: "member-b",
        label: `${card.groupName} B`,
        deal_price: card.currentPrice,
        original_price: card.originalPrice,
        max_quantity: Math.ceil(card.targetParticipants / 3),
        target_quantity: null,
        current_quantity: Math.floor(card.currentParticipants / 3),
        sort_order: 1,
        is_active: true,
        metadata: null,
      },
      {
        id: `${card.id}-member-c`,
        group_deal_id: card.id,
        option_type: "member",
        option_key: "member-c",
        label: `${card.groupName} C`,
        deal_price: card.currentPrice,
        original_price: card.originalPrice,
        max_quantity: Math.ceil(card.targetParticipants / 3),
        target_quantity: null,
        current_quantity: Math.ceil(card.currentParticipants / 3),
        sort_order: 2,
        is_active: true,
        metadata: null,
      },
    ],
    created_at: startsAt,
    updated_at: now,
  }
}

export const mapGroupDealToLandingCard = (deal: GroupDeal): LandingDealCard => {
  const category = resolveCategory(deal)
  const target = deal.target_quantity || deal.min_participants || 100
  const current = deal.current_participants ?? deal.current_quantity ?? 0

  return {
    id: deal.id,
    href: `/group-buying/${deal.id}`,
    groupName: resolveGroupName(deal),
    title: deal.title,
    imageUrl:
      resolveMediaUrl(
        typeof deal.metadata?.image_url === "string"
          ? deal.metadata.image_url
          : null
      ) ?? CATEGORY_IMAGES[category],
    category,
    originalPrice: deal.original_price,
    currentPrice: deal.deal_price,
    targetPrice: Math.round(deal.deal_price * 0.85),
    currencyCode: deal.currency_code,
    currentParticipants: current,
    targetParticipants: target,
    endsAt: deal.ends_at,
    isNew:
      Date.now() - new Date(deal.created_at).getTime() <
      1000 * 60 * 60 * 24 * 3,
  }
}

const MOCK_DEALS: LandingDealCard[] = [
  withLandingHref({
    id: "mock-bts-album",
    groupName: "BTS",
    title: "Proof Anthology Album (Weverse Edition)",
    imageUrl: CATEGORY_IMAGES.albums,
    category: "albums",
    originalPrice: 32800,
    currentPrice: 24900,
    targetPrice: 21900,
    currencyCode: "krw",
    currentParticipants: 158,
    targetParticipants: 200,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    isTrending: true,
    rank: 1,
  }),
  withLandingHref({
    id: "mock-ive-lightstick",
    groupName: "IVE",
    title: "Official Light Stick Ver.2",
    imageUrl: CATEGORY_IMAGES.lightsticks,
    category: "lightsticks",
    originalPrice: 45000,
    currentPrice: 38900,
    targetPrice: 34900,
    currencyCode: "krw",
    currentParticipants: 89,
    targetParticipants: 120,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    rank: 2,
  }),
  withLandingHref({
    id: "mock-newjeans-pc",
    groupName: "NewJeans",
    title: "Get Up Photocard Set (Limited)",
    imageUrl: CATEGORY_IMAGES.photocards,
    category: "photocards",
    originalPrice: 18000,
    currentPrice: 12900,
    targetPrice: 9900,
    currencyCode: "krw",
    currentParticipants: 312,
    targetParticipants: 400,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    isTrending: true,
    rank: 3,
  }),
  withLandingHref({
    id: "mock-aespa-doll",
    groupName: "aespa",
    title: "Mini Character Doll - Karina",
    imageUrl: CATEGORY_IMAGES.dolls,
    category: "dolls",
    originalPrice: 42000,
    currentPrice: 35900,
    targetPrice: 31900,
    currencyCode: "krw",
    currentParticipants: 67,
    targetParticipants: 100,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 52).toISOString(),
    isNew: true,
    rank: 4,
  }),
  withLandingHref({
    id: "mock-riize-hoodie",
    groupName: "RIIZE",
    title: "Fan Meeting Official Hoodie",
    imageUrl: CATEGORY_IMAGES.clothing,
    category: "clothing",
    originalPrice: 68000,
    currentPrice: 54900,
    targetPrice: 49900,
    currencyCode: "krw",
    currentParticipants: 45,
    targetParticipants: 80,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    isNew: true,
  }),
  withLandingHref({
    id: "mock-ive-keyring",
    groupName: "IVE",
    title: "Love Dive Keyring Set",
    imageUrl: CATEGORY_IMAGES.accessories,
    category: "accessories",
    originalPrice: 22000,
    currentPrice: 16900,
    targetPrice: 14900,
    currencyCode: "krw",
    currentParticipants: 182,
    targetParticipants: 250,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
  }),
]

export const getMockLandingDealById = (
  id: string
): LandingDealCard | undefined => MOCK_DEALS.find((deal) => deal.id === id)

const prioritizeByIdol = (
  cards: LandingDealCard[],
  favoriteIdolGroup?: string | null
) => {
  const idol = favoriteIdolGroup?.trim().toLowerCase()

  if (!idol) {
    return cards
  }

  return [...cards].sort((a, b) => {
    const aMatch = a.groupName.toLowerCase().includes(idol) ? 1 : 0
    const bMatch = b.groupName.toLowerCase().includes(idol) ? 1 : 0

    return bMatch - aMatch
  })
}

export const getLandingHomeData = async (options?: {
  favoriteIdolGroup?: string | null
}): Promise<LandingHomeData> => {
  const { group_deals: deals } = await listGroupDeals()
  const openDeals = deals.filter((deal) =>
    ["open", "minimum_reached", "active"].includes(deal.status)
  )

  const cards =
    openDeals.length > 0
      ? openDeals.map(mapGroupDealToLandingCard)
      : MOCK_DEALS

  const prioritizedCards = prioritizeByIdol(
    cards,
    options?.favoriteIdolGroup
  )

  const sortedByParticipants = [...prioritizedCards].sort(
    (a, b) => b.currentParticipants - a.currentParticipants
  )

  const popular = sortedByParticipants.slice(0, 6).map((card, index) => ({
    ...card,
    rank: index + 1,
  }))

  const now = Date.now()
  const endingSoon = prioritizeByIdol(
    cards
      .filter((card) => new Date(card.endsAt).getTime() - now <= 1000 * 60 * 60 * 24)
      .sort(
        (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
      ),
    options?.favoriteIdolGroup
  )

  const newlyOpened = cards
    .filter((card) => card.isNew)
    .slice(0, 4)

  const trending = cards
    .filter((card) => card.isTrending || card.currentParticipants > 100)
    .slice(0, 4)

  const fanFavorites = sortedByParticipants.slice(0, 4)

  return {
    dataSource: openDeals.length > 0 ? "api" : "mock",
    featured: popular[0] ?? cards[0],
    popular,
    trending: trending.length ? trending : popular.slice(0, 4),
    newlyOpened: newlyOpened.length ? newlyOpened : cards.slice(0, 4),
    fanFavorites,
    allDeals: prioritizedCards,
    endingSoon: endingSoon.length ? endingSoon : cards.slice(0, 3),
    favoriteIdolGroup: options?.favoriteIdolGroup ?? null,
  }
}

export const getSpotsLeft = (card: LandingDealCard) =>
  Math.max(0, card.targetParticipants - card.currentParticipants)

export const getParticipationRate = (card: LandingDealCard) => {
  if (card.targetParticipants <= 0) return 0
  return Math.min(
    100,
    Math.round((card.currentParticipants / card.targetParticipants) * 100)
  )
}

export const getHoursLeft = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)))
}

export const getDiscountPercent = (card: LandingDealCard) =>
  Math.round(
    ((card.originalPrice - card.currentPrice) / card.originalPrice) * 100
  )
