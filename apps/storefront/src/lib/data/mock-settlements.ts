import type { SettlementRecord } from "types/account-group-deals"

export const MOCK_SETTLEMENTS: SettlementRecord[] = [
  {
    id: "settle-mock-001",
    type: "escrow_release",
    amount: 128000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-settled",
    group_deal_title: "에스파 Synk : Parallel Line MD",
    description: "Participant escrow released to leader",
    processed_at: "2026-07-15T09:30:00.000Z",
  },
  {
    id: "settle-mock-002",
    type: "participant_refund",
    amount: 45000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-cancelled",
    group_deal_title: "뉴진스 Get Up POP-UP 한정",
    description: "Participant payment refunded",
    processed_at: "2026-07-12T14:00:00.000Z",
  },
  {
    id: "settle-mock-003",
    type: "unallocated_refund",
    amount: 22000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-unallocated",
    group_deal_title: "IVE I AM 앨범 공구",
    description: "Unallocated seat refund after recruitment closed",
    processed_at: "2026-07-10T11:20:00.000Z",
  },
  {
    id: "settle-mock-004",
    type: "deposit_refund",
    amount: 100000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-leader-settled",
    group_deal_title: "르세라핌 UNFORGIVEN 포토카드",
    description: "Leader deposit returned after settlement",
    processed_at: "2026-07-08T16:45:00.000Z",
  },
  {
    id: "settle-mock-005",
    type: "deposit_forfeiture",
    amount: 100000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-forfeiture",
    group_deal_title: "STAYC TEENFRESH POP-UP",
    description: "Deposit forfeited due to leader breach",
    forfeiture_reason:
      "총대 의무 위반(미발송): 모집 마감 후 14일 이내 발송 확인이 되지 않아 보증금이 몰수 처리되었습니다.",
    processed_at: "2026-06-28T10:00:00.000Z",
  },
  {
    id: "settle-mock-006",
    type: "deposit_forfeiture",
    amount: 50000,
    currency_code: "krw",
    status: "completed",
    group_deal_id: "deal-mock-forfeiture-2",
    group_deal_title: "NMIXX A Midsummer NMIXX's Dream",
    description: "Deposit forfeited due to false reporting",
    forfeiture_reason:
      "허위 발송 신고: 송장 번호가 확인되지 않으며 참여자 분쟁 접수 건과 일치합니다.",
    processed_at: "2026-06-20T08:15:00.000Z",
  },
]

export const getMockSettlements = (): SettlementRecord[] =>
  MOCK_SETTLEMENTS.map((record) => ({ ...record }))
