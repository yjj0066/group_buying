import { listGroupDeals } from "@lib/data/group-deals"
import type { GroupDeal } from "types/group-deal"
import type {
  LandingDealCard,
  LandingDealCategory,
  LandingHomeData,
} from "types/landing-deal"

const CATEGORY_IMAGES: Record<LandingDealCategory, string> = {
  albums:
    "https://images.unsplash.com/photo-1619983081563-430f6360275f?w=800&h=800&fit=crop",
  lightsticks:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop",
  photocards:
    "https://images.unsplash.com/photo-1571330737116-fde987fa9327?w=800&h=800&fit=crop",
  dolls:
    "https://images.unsplash.com/photo-1511379938546-c1f69419868d?w=800&h=800&fit=crop",
  clothing:
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop",
  accessories:
    "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&h=800&fit=crop",
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

const resolveGroupName = (deal: GroupDeal) => {
  if (deal.metadata?.idol_group) {
    return String(deal.metadata.idol_group)
  }

  const memberOption = deal.options?.find(
    (option) => option.option_type === "member"
  )

  return memberOption?.label ?? "K-POP"
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
    imageUrl: CATEGORY_IMAGES[category],
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
  {
    id: "mock-bts-album",
    href: "/group-buying",
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
  },
  {
    id: "mock-ive-lightstick",
    href: "/group-buying",
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
  },
  {
    id: "mock-newjeans-pc",
    href: "/group-buying",
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
  },
  {
    id: "mock-aespa-doll",
    href: "/group-buying",
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
  },
  {
    id: "mock-riize-hoodie",
    href: "/group-buying",
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
  },
  {
    id: "mock-ive-keyring",
    href: "/group-buying",
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
  },
]

export const getLandingHomeData = async (): Promise<LandingHomeData> => {
  const { group_deals: deals } = await listGroupDeals()
  const openDeals = deals.filter((deal) =>
    ["open", "minimum_reached", "active"].includes(deal.status)
  )

  const cards =
    openDeals.length > 0
      ? openDeals.map(mapGroupDealToLandingCard)
      : MOCK_DEALS

  const sortedByParticipants = [...cards].sort(
    (a, b) => b.currentParticipants - a.currentParticipants
  )

  const popular = sortedByParticipants.slice(0, 6).map((card, index) => ({
    ...card,
    rank: index + 1,
  }))

  const now = Date.now()
  const endingSoon = cards
    .filter((card) => new Date(card.endsAt).getTime() - now <= 1000 * 60 * 60 * 24)
    .sort(
      (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
    )

  const newlyOpened = cards
    .filter((card) => card.isNew)
    .slice(0, 4)

  const trending = cards
    .filter((card) => card.isTrending || card.currentParticipants > 100)
    .slice(0, 4)

  const fanFavorites = sortedByParticipants.slice(0, 4)

  return {
    featured: popular[0] ?? cards[0],
    popular,
    trending: trending.length ? trending : popular.slice(0, 4),
    newlyOpened: newlyOpened.length ? newlyOpened : cards.slice(0, 4),
    fanFavorites,
    allDeals: cards,
    endingSoon: endingSoon.length ? endingSoon : cards.slice(0, 3),
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
