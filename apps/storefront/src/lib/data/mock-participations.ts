import type { AccountParticipation } from "types/account-group-deals"

const baseDeal = (
  partial: Partial<AccountParticipation["group_deal"]> &
    Pick<AccountParticipation["group_deal"], "id" | "title">
): AccountParticipation["group_deal"] => ({
  status: "open",
  leader_stage: "recruiting",
  deposit_status: "deposited",
  deposit_amount: 18500,
  currency_code: "krw",
  current_participants: 4,
  target_quantity: 9,
  ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  purchase_receipt_status: "pending",
  receipt_ai_status: "not_requested",
  tracking_ai_status: "not_requested",
  report_stage: "not_started",
  dispute_status: "none",
  created_at: new Date().toISOString(),
  ...partial,
})

const defaultAddress = {
  recipient_name: "김민지",
  phone: "010-1234-5678",
  postal_code: "06236",
  address_line_1: "서울특별시 강남구 테헤란로 123",
  address_line_2: "101동 1204호",
  delivery_note: "문 앞에 놔주세요",
}

export const MOCK_PARTICIPATIONS: AccountParticipation[] = [
  {
    participant_id: "part-mock-deposit",
    quantity: 1,
    status: "pending_deposit",
    stage: "recruiting",
    member_label: "민지",
    tracking_number: null,
    carrier: null,
    payment_deadline: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress },
    group_deal: baseDeal({
      id: "deal-newjeans-bunjang",
      title: "NewJeans Bunnies Camp MD 분철",
    }),
    created_at: new Date().toISOString(),
  },
  {
    participant_id: "part-mock-order",
    quantity: 1,
    status: "confirmed",
    stage: "payment_complete",
    member_label: "하니",
    tracking_number: null,
    carrier: null,
    payment_deadline: null,
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress, recipient_name: "이하니" },
    group_deal: baseDeal({
      id: "deal-newjeans-bunjang",
      title: "NewJeans Bunnies Camp MD 분철",
      purchase_receipt_status: "pending",
    }),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    participant_id: "part-mock-prep",
    quantity: 1,
    status: "confirmed",
    stage: "opening",
    member_label: "카리나",
    tracking_number: null,
    carrier: null,
    payment_deadline: null,
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress, recipient_name: "박카리나" },
    group_deal: baseDeal({
      id: "deal-aespa-album",
      title: "aespa Whiplash 앨범 분철",
      status: "closed",
      purchase_receipt_status: "verified",
    }),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    participant_id: "part-mock-shipping",
    quantity: 1,
    status: "confirmed",
    stage: "shipping",
    member_label: "원영",
    tracking_number: "123456789012",
    carrier: "CJ대한통운",
    payment_deadline: null,
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress, recipient_name: "장원영" },
    group_deal: baseDeal({
      id: "deal-ive-photo",
      title: "IVE WAVE 포토카드 세트 분철",
      status: "closed",
      purchase_receipt_status: "verified",
    }),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    participant_id: "part-mock-delivered",
    quantity: 1,
    status: "purchase_confirmed",
    stage: "delivery_confirmed",
    member_label: "나연",
    tracking_number: "987654321098",
    carrier: "CJ대한통운",
    payment_deadline: null,
    delivery_confirmed_at: new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString(),
    shipping_address: { ...defaultAddress, recipient_name: "임나연" },
    group_deal: baseDeal({
      id: "deal-twice-season-greetings",
      title: "TWICE 2026 SEASON'S GREETINGS",
      status: "settled",
      purchase_receipt_status: "verified",
    }),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    participant_id: "part-mock-cancelled",
    quantity: 1,
    status: "cancelled",
    stage: "recruiting",
    member_label: "윈터",
    tracking_number: null,
    carrier: null,
    payment_deadline: null,
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress, recipient_name: "김윈터" },
    group_deal: baseDeal({
      id: "deal-aespa-album",
      title: "aespa Whiplash 앨범 분철",
      status: "cancelled",
    }),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    participant_id: "part-mock-refunded",
    quantity: 1,
    status: "refunded",
    stage: "payment_complete",
    member_label: "레이",
    tracking_number: null,
    carrier: null,
    payment_deadline: null,
    delivery_confirmed_at: null,
    shipping_address: { ...defaultAddress, recipient_name: "김레이" },
    group_deal: baseDeal({
      id: "deal-ive-photo",
      title: "IVE WAVE 포토카드 세트 분철",
      status: "cancelled",
    }),
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const cloneParticipation = (
  item: AccountParticipation
): AccountParticipation => ({
  ...item,
  group_deal: { ...item.group_deal },
  shipping_address: item.shipping_address
    ? { ...item.shipping_address }
    : null,
})

let mockParticipationsState: AccountParticipation[] | null = null

const getMockParticipationsState = (): AccountParticipation[] => {
  if (!mockParticipationsState) {
    mockParticipationsState = MOCK_PARTICIPATIONS.map(cloneParticipation)
  }

  return mockParticipationsState
}

export const getMockParticipations = (): AccountParticipation[] =>
  getMockParticipationsState().map(cloneParticipation)

export const confirmMockParticipationDelivery = (participantId: string) => {
  const participations = getMockParticipationsState()
  const index = participations.findIndex(
    (participation) => participation.participant_id === participantId
  )

  if (index === -1) {
    throw new Error("참여 내역을 찾을 수 없습니다.")
  }

  const current = participations[index]

  if (current.delivery_confirmed_at) {
    return {
      participation: cloneParticipation(current),
      all_delivery_confirmed: false,
    }
  }

  if (current.stage !== "shipping") {
    throw new Error("배송 중인 참여만 수령 확인할 수 있습니다.")
  }

  const updated: AccountParticipation = {
    ...current,
    status: "purchase_confirmed",
    stage: "delivery_confirmed",
    delivery_confirmed_at: new Date().toISOString(),
  }

  participations[index] = updated

  const dealId = current.group_deal.id
  const dealParticipants = participations.filter(
    (participation) => participation.group_deal.id === dealId
  )
  const allDeliveryConfirmed = dealParticipants.every(
    (participation) =>
      participation.delivery_confirmed_at !== null ||
      participation.stage === "delivery_confirmed"
  )

  return {
    participation: cloneParticipation(updated),
    all_delivery_confirmed: allDeliveryConfirmed,
  }
}
