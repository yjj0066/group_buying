import type { GroupBuyingMode } from "@lib/group-buying/mode"

const withCountry = (countryCode: string, path: string) =>
  `/${countryCode}${path.startsWith("/") ? path : `/${path}`}`

export const gbAppRoutes = {
  splash: (cc: string) => withCountry(cc, "/splash"),
  login: (cc: string) => withCountry(cc, "/auth/login"),
  signup: (cc: string) => withCountry(cc, "/auth/signup"),
  bankAccount: (cc: string) => withCountry(cc, "/auth/bank-account"),
  home: (cc: string) => withCountry(cc, "/home"),
  search: (cc: string) => withCountry(cc, "/search"),
  searchEmpty: (cc: string) => withCountry(cc, "/search/empty"),
  waitlist: (cc: string) => withCountry(cc, "/waitlist"),
  deal: (cc: string, dealId: string) => withCountry(cc, `/deals/${dealId}`),
  dealClosed: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/closed`),
  dealApply: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/apply`),
  dealDeposit: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/deposit`),
  dealDepositExpired: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/deposit/expired`),
  dealComplete: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/complete`),
  dealReport: (cc: string, dealId: string) =>
    withCountry(cc, `/deals/${dealId}/report`),
  participations: (cc: string) => withCountry(cc, "/participations"),
  reviewNew: (cc: string) => withCountry(cc, "/reviews/new"),
  disputeNew: (cc: string) => withCountry(cc, "/disputes/new"),
  sellerCreate: (cc: string) => withCountry(cc, "/seller/create/basic"),
  sellerCreateBasic: (cc: string) => withCountry(cc, "/seller/create/basic"),
  sellerCreateProduct: (cc: string) => withCountry(cc, "/seller/create/product"),
  sellerCreateSales: (cc: string) => withCountry(cc, "/seller/create/sales"),
  sellerCreateShipping: (cc: string) => withCountry(cc, "/seller/create/shipping"),
  sellerCreateDeposit: (cc: string) => withCountry(cc, "/seller/create/deposit"),
  sellerDeal: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}`),
  sellerDealReport: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/report`),
  sellerUrgentFill: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/urgent-fill`),
  sellerSeats: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/seats`),
  sellerRecruitment: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/recruitment`),
  sellerFinalize: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/finalize`),
  sellerPacking: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/packing`),
  sellerPurchase: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/purchase`),
  sellerPurchaseProof: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/purchase-proof`),
  sellerPurchaseVerify: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/quantity-verification`),
  sellerQuantityVerification: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/quantity-verification`),
  sellerManualDistribution: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/manual-distribution`),
  sellerPurchaseFailed: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/purchase/failed`),
  sellerOpening: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/opening`),
  sellerOpeningShortage: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/opening/shortage`),
  sellerShipping: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/shipping`),
  sellerShippingConfirm: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/shipping/confirm`),
  sellerSettlement: (cc: string, dealId: string) =>
    withCountry(cc, `/seller/deals/${dealId}/settlement`),
  sellerWireframeCheck: (cc: string) => withCountry(cc, "/seller/wireframe-check"),
  my: (cc: string) => withCountry(cc, "/my"),
  myAccount: (cc: string) => withCountry(cc, "/my/account"),
  myHosted: (cc: string) => withCountry(cc, "/my/hosted"),
  myParticipations: (cc: string) => withCountry(cc, "/my/participations"),
  participationDetail: (cc: string, participantId: string) =>
    withCountry(cc, `/participations/${participantId}`),
  participationReview: (cc: string, participantId: string) =>
    withCountry(cc, `/my/participations/${participantId}/review`),
  mySettlements: (cc: string) => withCountry(cc, "/my/settlements"),
  myTrust: (cc: string) => withCountry(cc, "/my/trust-reviews"),
  myTrustReviews: (cc: string) => withCountry(cc, "/my/trust-reviews"),
  myProfile: (cc: string) => withCountry(cc, "/my/profile"),
  myNotifications: (cc: string) => withCountry(cc, "/my/notifications"),
  mySupport: (cc: string) => withCountry(cc, "/my/support"),
  mySupportInquiry: (cc: string) => withCountry(cc, "/my/support/inquiry"),
  mySupportDispute: (cc: string) => withCountry(cc, "/my/support/dispute"),
  mySupportDisputeWithDeal: (cc: string, dealId: string) =>
    `${withCountry(cc, "/my/support/dispute")}?dealId=${encodeURIComponent(dealId)}&type=dispute`,
  mySupportObjection: (cc: string, transactionId: string, dealId?: string) => {
    const params = new URLSearchParams({
      type: "dispute",
      transactionId,
    })

    if (dealId) {
      params.set("dealId", dealId)
    }

    return `${withCountry(cc, "/my/support/dispute")}?${params.toString()}`
  },
} as const

export type GbTabKey =
  | "home"
  | "search"
  | "create"
  | "participations"
  | "myHosted"
  | "my"

export type GbTabItem = {
  key: GbTabKey
  labelKey: GbTabKey
  href: (countryCode: string) => string
  matchPrefixes: string[]
}

export const GB_TAB_CONFIG: Record<GbTabKey, Omit<GbTabItem, "key" | "labelKey">> =
  {
    home: {
      href: gbAppRoutes.home,
      matchPrefixes: ["/home", "/splash"],
    },
    search: {
      href: gbAppRoutes.search,
      matchPrefixes: ["/search", "/deals", "/waitlist"],
    },
    create: {
      href: gbAppRoutes.sellerCreate,
      matchPrefixes: ["/seller/create", "/seller/deals"],
    },
    participations: {
      href: gbAppRoutes.participations,
      matchPrefixes: [
        "/participations",
        "/my/participations",
        "/reviews",
        "/disputes",
      ],
    },
    myHosted: {
      href: gbAppRoutes.myHosted,
      matchPrefixes: ["/my/hosted"],
    },
    my: {
      href: gbAppRoutes.my,
      matchPrefixes: ["/my", "/auth"],
    },
  }

export const GB_PARTICIPANT_TAB_KEYS: GbTabKey[] = [
  "home",
  "search",
  "participations",
  "my",
]

export const GB_LEADER_TAB_KEYS: GbTabKey[] = [
  "home",
  "myHosted",
  "create",
  "my",
]

/** MYP0 my-page flow: 홈 · 검색 · 개설 · 내 참여 · MY */
export const GB_MY_FLOW_TAB_KEYS: GbTabKey[] = [
  "home",
  "search",
  "create",
  "participations",
  "my",
]

export const getGbTabItemsFromKeys = (keys: GbTabKey[]): GbTabItem[] =>
  keys.map((key) => ({
    key,
    labelKey: key,
    ...GB_TAB_CONFIG[key],
  }))

export const getGbTabItems = (mode: GroupBuyingMode): GbTabItem[] => {
  const keys =
    mode === "leader" ? GB_LEADER_TAB_KEYS : GB_PARTICIPANT_TAB_KEYS

  return getGbTabItemsFromKeys(keys)
}

export const isMyFlowTabRoute = (pathAfterCountry: string): boolean =>
  pathAfterCountry === "/my" || pathAfterCountry.startsWith("/my/")

/** @deprecated Use getGbTabItems(mode) with i18n labels instead */
export const GB_TAB_ITEMS = getGbTabItems("participant")

const GB_MY_SUBPAGE_TITLES: Record<string, string> = {
  "/my/account": "계좌 관리",
  "/my/hosted": "내 공구 관리",
  "/my/participations": "내 참여 관리",
  "/my/settlements": "정산·환불 내역",
  "/my/trust": "신뢰도·후기",
  "/my/trust-reviews": "신뢰도·후기",
  "/my/profile": "내 정보 관리",
  "/my/notifications": "알림 설정",
  "/my/support": "고객센터",
  "/my/support/inquiry": "1:1 문의",
  "/my/support/dispute": "분쟁 신고",
}

export type GbAppSubpageHeader = {
  title: string
  showBack: true
  backHref: string
}

export const resolveGbAppSubpageHeader = (
  countryCode: string,
  pathAfterCountry: string
): GbAppSubpageHeader | null => {
  const normalized =
    pathAfterCountry.endsWith("/") && pathAfterCountry.length > 1
      ? pathAfterCountry.slice(0, -1)
      : pathAfterCountry

  const title = GB_MY_SUBPAGE_TITLES[normalized]

  if (!title) {
    return null
  }

  return {
    title,
    showBack: true,
    backHref: gbAppRoutes.my(countryCode),
  }
}
