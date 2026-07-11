import type { Dictionary } from "../types"

const dictionary: Dictionary = {
  nav: {
    storeName: "공동구매몰",
    groupBuying: "공동구매",
    account: "계정",
    cart: "장바구니",
    menu: "메뉴",
  },
  hero: {
    badge: "한정판 공동구매",
    title: "함께 모일수록 내려가는 특별한 가격",
    subtitle:
      "목표 인원이 달성되면 특별 할인가로 파격적으로 배송되는 한정판 공동구매에 지금 탑승하세요!",
    cta: "공동구매 둘러보기",
  },
  products: {
    allProducts: "전체 상품",
    products: "상품",
    homeDescription:
      "출판(Published)된 상품이 조건 없이 모두 표시됩니다.",
    groupBuyingDescription:
      "출판된 상품이 모두 표시됩니다. 함께 모이면 더 저렴하게 구매할 수 있습니다.",
    empty:
      "출판된 상품이 없습니다. Medusa Admin에서 상품을 Published 상태로 등록해 주세요.",
    regionError:
      "리전 정보를 불러올 수 없습니다. Medusa Admin에서 리전을 설정해 주세요.",
    detailDescription: "상세 설명",
    relatedProducts: "관련 상품",
    relatedProductsDescription:
      "이 상품과 함께 보면 좋은 상품을 확인해 보세요.",
    addToCart: "장바구니에 담기",
    selectVariant: "옵션을 선택해 주세요",
    outOfStock: "품절",
    selectOptions: "옵션 선택",
    priceFrom: "최저 ",
    originalPriceLabel: "정가: ",
  },
  groupBuying: {
    title: "공동구매",
    backToList: "← 공동구매 목록",
    discount: "할인",
    originalPrice: "정가",
    targetAndCurrent: "목표 {target}명 · 현재 {current}명 참여",
    joinTitle: "참여하기",
    participants: "{current} / {target}명 참여",
    joinSuccess: "공동구매 참여가 완료되었습니다!",
    joinSuccessNote: "목표 인원 달성 시 할인가로 결제가 진행됩니다.",
    joinClosedFull: "목표 인원이 달성되어 참여가 마감되었습니다.",
    joinClosedInactive: "현재 참여할 수 없는 공동구매입니다.",
    email: "이메일",
    quantity: "수량",
    joinButton: "공동구매 참여하기",
    joining: "참여 중...",
    joinError: "참여 중 오류가 발생했습니다.",
    timeRemaining: "남은 시간",
  },
  cart: {
    title: "장바구니",
    quantity: "수량",
    remove: "삭제",
    subtotal: "소계",
    subtotalNote: "(세금 제외)",
    goToCart: "장바구니로 이동",
    empty: "장바구니가 비어 있습니다.",
    explore: "상품 둘러보기",
  },
  sideMenu: {
    home: "홈",
    store: "스토어",
    account: "계정",
    cart: "장바구니",
    copyright: "All rights reserved.",
  },
  idol: {
    productionStatus: "제작 진행 상태",
    participationRate: "실시간 참여율",
    participationProgress: "{current} / {target}명 참여 중",
    unlockEvent: "특전 해금 이벤트",
    achievementRate: "{rate}% 달성",
    milestoneAchieved: "{threshold}% 달성",
    unlocked: "해금됨",
    optionSelect: "{title} 선택",
    stages: {
      demand_survey: { label: "수요조사", shortLabel: "수요" },
      pre_deposit: { label: "선입금 진행", shortLabel: "선입금" },
      general_deposit: { label: "일반입금", shortLabel: "일반입금" },
      in_production: { label: "제작 진행 중", shortLabel: "제작" },
      shipping: { label: "배송 시작", shortLabel: "배송" },
    },
    milestones: {
      productionConfirmed: "제작 확정",
      hologramSticker: "홀로그램 스티커 증정",
      unreleasedPocaSet: "미공개 포카 스페셜 세트 증정",
    },
    bonus: {
      preDepositTitle: "선입금 특전: 미공개 포토카드 1:1 증정",
      preDepositDescription:
        "선입금 기간에 참여하시면 랜덤 미공개 포토카드를 드려요",
      fullSetTitle: "풀세트 특전: 중복 없는 포카 세트 증정",
      fullSetDescription:
        "전체 멤버 옵션 선택 시, 멤버별 포토카드가 중복 없이 구성됩니다",
    },
    demandSurvey: {
      title: "수요조사 참여",
      description:
        "이 굿즈 제작에 관심이 있으시면 참여해 주세요. 참여 인원이 모이면 다음 단계로 진행됩니다.",
      clickHint: "수요조사 단계를 눌러 참여할 수 있습니다.",
      joinShort: "참여",
      participateButton: "수요조사 참여하기",
      participating: "참여 중...",
      success: "수요조사 참여가 완료되었습니다. 감사합니다!",
      alreadyParticipated: "이미 수요조사에 참여하셨습니다.",
      error: "참여 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      close: "닫기",
      emailLabel: "이메일 (선택)",
      emailPlaceholder: "example@email.com",
      emailOptional: "이메일을 남기시면 제작 소식을 받아보실 수 있습니다.",
    },
  },
}

export default dictionary
