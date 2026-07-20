export type SupportFaqCategory = {
  id: string
  question: string
  answer: string
}

export const SUPPORT_FAQ_CATEGORIES: SupportFaqCategory[] = [
  {
    id: "deposit-not-received",
    question: "입금이 안 됐어요",
    answer:
      "가상계좌 입금 후 영업일 기준 10~30분 내 자동 확인됩니다. 입금자명·금액이 신청 정보와 다르면 확인이 지연될 수 있습니다. 1시간이 지나도 '입금 확인중'이면 1:1 문의로 입금 영수증을 첨부해 주세요.",
  },
  {
    id: "wrong-deposit-amount",
    question: "금액을 잘못 입금했어요",
    answer:
      "과·미입금 모두 1:1 문의로 접수해 주세요. 과입금은 차액 환불, 미입금은 추가 입금 안내 또는 참여 취소 후 재신청을 도와드립니다. 분쟁 신고가 아닌 일반 문의로 접수해 주세요.",
  },
  {
    id: "deal-progress",
    question: "공구 진행 문의",
    answer:
      "모집 마감, 오픈, 배송 일정은 공구 상세·참여 리포트에서 확인할 수 있습니다. 총대가 일정을 변경한 경우 참여자에게 알림이 발송됩니다. 진행 지연·연락 두절이 의심되면 분쟁 신고를 이용해 주세요.",
  },
  {
    id: "refund-settlement",
    question: "환불·정산 문의",
    answer:
      "미배정 환불·참여 취소 환불은 등록 계좌로 3~5영업일 내 처리됩니다. 총대 정산은 전원 수령 확인 후 진행되며, 분쟁 접수 시 해당 건 정산이 보류(정산 보류)됩니다.",
  },
]

export const filterSupportFaq = (
  categories: SupportFaqCategory[],
  query: string
): SupportFaqCategory[] => {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return categories
  }

  return categories.filter(
    (item) =>
      item.question.toLowerCase().includes(normalized) ||
      item.answer.toLowerCase().includes(normalized)
  )
}
