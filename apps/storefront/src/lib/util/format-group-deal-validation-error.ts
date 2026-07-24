import { formatUploadSizeErrorMessage } from "@lib/util/upload-size-error"

const FIELD_LABELS: Record<string, string> = {
  primary_seller: "1차 판매처",
  expected_ship_date: "예상 발송일",
  ends_at: "모집 마감일",
  starts_at: "모집 시작일",
  title: "공구 제목",
  description: "공구 설명",
  product_id: "상품",
  min_participants: "최소 참여 인원",
  target_quantity: "목표 수량",
  original_price: "정가",
  deal_price: "공구 가격",
  declared_album_quantity: "앨범 수량",
  member_seats: "멤버 자리",
  idol_group: "아이돌 그룹",
  goods_type: "굿즈 종류",
}

const translateValidationSegment = (segment: string): string | null => {
  const trimmed = segment.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("Invalid request:")) {
    return translateValidationSegment(trimmed.replace(/^Invalid request:\s*/, ""))
  }

  const tooSmallMatch = trimmed.match(
    /Value for field '([^']+)' too small, expected at least: '([^']+)'/
  )

  if (tooSmallMatch) {
    const [, field] = tooSmallMatch
    const label = FIELD_LABELS[field] ?? field

    if (field === "primary_seller") {
      return "1차 판매처를 입력해 주세요."
    }

    return `${label} 값이 비어 있거나 너무 작습니다. 다시 입력해 주세요.`
  }

  const tooBigMatch = trimmed.match(
    /Value for field '([^']+)' too big, expected at most: '([^']+)'/
  )

  if (tooBigMatch) {
    const [, field] = tooBigMatch
    const label = FIELD_LABELS[field] ?? field

    return `${label} 값이 너무 큽니다. 다시 확인해 주세요.`
  }

  const requiredMatch = trimmed.match(/Required at '([^']+)'/)

  if (requiredMatch) {
    const [, field] = requiredMatch
    const label = FIELD_LABELS[field] ?? field

    return `${label}을(를) 입력해 주세요.`
  }

  if (/Invalid ISO datetime/i.test(trimmed)) {
    return "날짜·시간 형식이 올바르지 않습니다. 모집 마감일과 예상 발송일을 확인해 주세요."
  }

  const unrecognizedMatch = trimmed.match(/Unrecognized fields: '([^']+)'/)

  if (unrecognizedMatch) {
    const fields = unrecognizedMatch[1]
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
    const labels = fields.map((field) => FIELD_LABELS[field] ?? field)

    if (labels.length) {
      return `다음 항목을 다시 확인해 주세요: ${labels.join(", ")}`
    }

    return "입력 정보 형식에 문제가 있습니다. 1~3단계 내용을 다시 확인해 주세요."
  }

  if (/Expected number, received nan/i.test(trimmed)) {
    return "숫자로 입력해야 하는 항목이 비어 있거나 형식이 올바르지 않습니다."
  }

  if (/Expected string, received null/i.test(trimmed)) {
    return "필수 입력 항목이 비어 있습니다."
  }

  if (/Product with id .+ was not found/i.test(trimmed)) {
    return "공구에 연결할 상품을 찾을 수 없습니다. 관리자에게 demo-product-group-buy 시드 적용 여부를 확인해 주세요."
  }

  if (/Only published products can be used for group deals/i.test(trimmed)) {
    return "선택한 상품은 공구에 사용할 수 없습니다. 게시된 상품인지 확인해 주세요."
  }

  if (/Product must have at least one variant/i.test(trimmed)) {
    return "공구에 연결할 상품에 옵션(변형)이 없습니다. 관리자에게 문의해 주세요."
  }

  if (/Selected variant does not belong to the product/i.test(trimmed)) {
    return "선택한 상품 옵션이 올바르지 않습니다. 다시 시도해 주세요."
  }

  if (/Unauthorized/i.test(trimmed)) {
    return "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
  }

  if (/Group deal creation failed on the server/i.test(trimmed)) {
    return "공구 생성 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
  }

  if (/Only the deal leader can record leader deposit/i.test(trimmed)) {
    return "보증금 입금 확인 권한이 없습니다. 로그인 계정을 확인해 주세요."
  }

  if (/Leader deposit is already recorded/i.test(trimmed)) {
    return "이미 보증금 입금이 확인된 공구입니다. 내 공구 목록에서 진행 상태를 확인해 주세요."
  }

  if (/Uploaded media is not publicly accessible|S3_|Object storage is configured/i.test(trimmed)) {
    return "공구 사진 저장에 실패했습니다. Render/S3(R2) 설정을 확인하거나, 사진 없이 다시 시도해 주세요."
  }

  if (/Deal price cannot exceed original price/i.test(trimmed)) {
    return "공구 가격은 정가보다 클 수 없습니다. 멤버 자리 가격을 확인해 주세요."
  }

  if (/End date must be after start date/i.test(trimmed)) {
    return "모집 마감일은 시작일 이후여야 합니다. 날짜를 확인해 주세요."
  }

  if (/Invalid start or end date/i.test(trimmed)) {
    return "모집 시작일 또는 마감일 형식이 올바르지 않습니다."
  }

  if (/Number must be greater than 0/i.test(trimmed)) {
    return "0보다 큰 숫자를 입력해야 하는 항목이 있습니다. 멤버 자리 가격과 수량을 확인해 주세요."
  }

  if (/Invalid datetime|string must contain/i.test(trimmed)) {
    return "날짜·시간 형식이 올바르지 않습니다. 모집 마감일과 예상 발송일을 확인해 주세요."
  }

  if (/Too small: expected string to have >=1 character/i.test(trimmed)) {
    return "필수 입력 항목이 비어 있습니다."
  }

  return null
}

export const shouldSuggestLeaderCreateStepReview = (message: string): boolean =>
  /입력|모집 마감|자리 가격|앨범 수량|1차 판매|필수|too small|Required at|Expected number|Expected string|Invalid ISO datetime|Invalid datetime/i.test(
    message
  )

export const formatGroupDealValidationError = (raw: string): string => {
  const normalized = raw.trim()

  if (!normalized) {
    return "공구 개설 정보를 확인해 주세요."
  }

  const uploadSizeMessage = formatUploadSizeErrorMessage(normalized)

  if (uploadSizeMessage) {
    return uploadSizeMessage
  }

  const segments = normalized.includes(";")
    ? normalized.split(";")
    : [normalized]

  const translated = segments
    .map((segment) => translateValidationSegment(segment))
    .filter((message): message is string => Boolean(message))

  const unique = [...new Set(translated)]

  if (unique.length) {
    return unique.join("\n")
  }

  if (/fetch failed|network|ECONNREFUSED/i.test(normalized)) {
    return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
  }

  // Unknown server/API messages should be shown as-is instead of hiding the cause.
  return normalized
}
