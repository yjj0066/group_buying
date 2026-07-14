export type KpopAlbumMock = {
  id: string
  groupName: string
  albumTitle: string
  coverImageUrl: string
  price: number
  originalPrice: number
  currencyCode: string
  currentParticipants: number
  targetParticipants: number
  endsAt: string
}

export const KPOP_ALBUM_SHOWCASE: KpopAlbumMock[] = [
  {
    id: "album-nebula-1st",
    groupName: "NEBULA",
    albumTitle: "1st Mini Album - Starlight",
    coverImageUrl:
      "https://images.unsplash.com/photo-1619983081563-430f6360275f?w=600&h=600&fit=crop",
    price: 18900,
    originalPrice: 24900,
    currencyCode: "krw",
    currentParticipants: 847,
    targetParticipants: 1000,
    endsAt: "2026-07-28T23:59:59.000Z",
  },
  {
    id: "album-lumin-2nd",
    groupName: "LUMIN",
    albumTitle: "2nd Full Album - Eclipse",
    coverImageUrl:
      "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&h=600&fit=crop",
    price: 22900,
    originalPrice: 29900,
    currencyCode: "krw",
    currentParticipants: 612,
    targetParticipants: 800,
    endsAt: "2026-07-21T23:59:59.000Z",
  },
  {
    id: "album-aurora-special",
    groupName: "AURORA",
    albumTitle: "Special Single - Midnight Bloom",
    coverImageUrl:
      "https://images.unsplash.com/photo-1571330737116-fde987fa9327?w=600&h=600&fit=crop",
    price: 15900,
    originalPrice: 19900,
    currencyCode: "krw",
    currentParticipants: 423,
    targetParticipants: 500,
    endsAt: "2026-07-18T23:59:59.000Z",
  },
  {
    id: "album-eclipse-repackage",
    groupName: "ECLIPSE",
    albumTitle: "Repackage - Neon Dreams",
    coverImageUrl:
      "https://images.unsplash.com/photo-1511379938546-c1f69419868d?w=600&h=600&fit=crop",
    price: 19900,
    originalPrice: 25900,
    currencyCode: "krw",
    currentParticipants: 956,
    targetParticipants: 1200,
    endsAt: "2026-08-01T23:59:59.000Z",
  },
]
