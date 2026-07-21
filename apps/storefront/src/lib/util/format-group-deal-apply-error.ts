export const formatGroupDealApplyError = (raw: string): string => {
  const message = raw.trim()

  if (!message) {
    return "참여 중 오류가 발생했습니다."
  }

  if (/not associated with any stock location/i.test(message)) {
    return "데모 상품 재고 설정이 필요합니다. 백엔드에서 pnpm seed:group-buy-demo-product를 실행한 뒤 다시 시도해 주세요."
  }

  if (/Group deal is missing a product variant/i.test(message)) {
    return "공구에 연결된 상품 옵션이 없습니다. 총대에게 문의하거나 다른 공구를 선택해 주세요."
  }

  return message
}
