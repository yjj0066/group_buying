import { gbAppRoutes } from "@lib/wireframe/routes"

export const WIREFRAME_PREVIEW_DEAL_ID = "deal-hosted-aespa"

export type WireframeCheckStatus = "done" | "partial" | "missing"

export type WireframeCheckItem = {
  id: string
  label: string
  status: WireframeCheckStatus
  note?: string
}

export type WireframeFlowScreenCheck = {
  screenId: string
  title: string
  description: string
  resolveHref: (countryCode: string, dealId: string) => string
  flowHint?: string
  items: WireframeCheckItem[]
}

export const LEADER_OPENING_FLOW_CHECKS: WireframeFlowScreenCheck[] = [
  {
    screenId: "PURC-F",
    title: "검증 실패 · 소명 요청",
    description: "영수증 자동 검증 실패 후 총대 소명 제출",
    resolveHref: (countryCode, dealId) =>
      gbAppRoutes.sellerPurchaseFailed(countryCode, dealId),
    flowHint: "PURC(영수증 업로드)에서 검증 실패 시 이동",
    items: [
      {
        id: "purc-f-banner",
        label: "D+7 · 소명 필요 상태 배너",
        status: "missing",
        note: "마감 D-day 배너 미구현",
      },
      {
        id: "purc-f-results",
        label: "자동 검증 결과 (통과/실패 항목)",
        status: "missing",
        note: "주문번호·판매처·주문일시·수량 대조 목록",
      },
      {
        id: "purc-f-explanation",
        label: "소명 내용 입력",
        status: "done",
      },
      {
        id: "purc-f-evidence",
        label: "증빙 첨부",
        status: "missing",
      },
      {
        id: "purc-f-timer",
        label: "소명 제출 기한 타이머",
        status: "missing",
      },
      {
        id: "purc-f-submit",
        label: "소명 제출 CTA",
        status: "partial",
        note: "영수증 재업로드로 연결됨",
      },
    ],
  },
  {
    screenId: "OPEN",
    title: "개봉 · 배정",
    description: "개봉 결과 입력 후 멤버별 배정",
    resolveHref: (countryCode, dealId) =>
      gbAppRoutes.sellerOpening(countryCode, dealId),
    flowHint: "영수증 검증 통과 후 개봉 단계",
    items: [
      {
        id: "open-steppers",
        label: "멤버별 +/- 수량 입력",
        status: "done",
      },
      {
        id: "open-totals",
        label: "입력 총량 vs 구매 앨범 비교",
        status: "done",
      },
      {
        id: "open-photo",
        label: "개봉 인증샷 업로드",
        status: "partial",
        note: "플레이스홀더만 있음",
      },
      {
        id: "open-table",
        label: "배정 비교 테이블",
        status: "done",
      },
      {
        id: "open-mode",
        label: "선착순 / 랜덤 배정 선택",
        status: "done",
      },
      {
        id: "open-submit",
        label: "배정 실행",
        status: "done",
      },
      {
        id: "open-shortage-route",
        label: "수량 부족 시 OPEN-S 이동",
        status: "done",
      },
    ],
  },
  {
    screenId: "OPEN-S",
    title: "수량 부족 · 미배정",
    description: "부족 멤버 미배정 처리 및 환불 안내",
    resolveHref: (countryCode, dealId) =>
      gbAppRoutes.sellerOpeningShortage(countryCode, dealId),
    flowHint: "OPEN에서 부족 수량 입력 후 자동 이동 · 또는 데모 데이터 준비",
    items: [
      {
        id: "open-s-alert",
        label: "부족 멤버 경고 배너",
        status: "done",
      },
      {
        id: "open-s-compare",
        label: "배정 비교 테이블",
        status: "done",
      },
      {
        id: "open-s-refund",
        label: "미배정 참여자 환불 목록",
        status: "done",
        note: "OPEN 결과(sessionStorage) 필요",
      },
      {
        id: "open-s-info",
        label: "자동 환불·우선권 안내",
        status: "done",
      },
      {
        id: "open-s-confirm",
        label: "미배정 확정",
        status: "done",
      },
    ],
  },
]

export const countWireframeCheckStatuses = (items: WireframeCheckItem[]) =>
  items.reduce(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { done: 0, partial: 0, missing: 0 }
  )
