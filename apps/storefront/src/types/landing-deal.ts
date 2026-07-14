export type LandingDealCategory =
  | "albums"
  | "lightsticks"
  | "photocards"
  | "dolls"
  | "clothing"
  | "accessories"

export type LandingDealCard = {
  id: string
  href: string
  groupName: string
  title: string
  imageUrl: string
  category: LandingDealCategory
  originalPrice: number
  currentPrice: number
  targetPrice: number
  currencyCode: string
  currentParticipants: number
  targetParticipants: number
  endsAt: string
  isNew?: boolean
  isTrending?: boolean
  rank?: number
}

export type LandingHomeData = {
  featured: LandingDealCard
  popular: LandingDealCard[]
  trending: LandingDealCard[]
  newlyOpened: LandingDealCard[]
  fanFavorites: LandingDealCard[]
  allDeals: LandingDealCard[]
  endingSoon: LandingDealCard[]
}
