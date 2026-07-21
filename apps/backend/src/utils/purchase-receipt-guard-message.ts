import {
  GroupDealDocumentAiStatus,
  GroupDealReceiptStatus,
} from "../types/group-buying"
import { getDocumentAiAutoVerifyConfidence } from "./hybrid-api-config"

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  [GroupDealReceiptStatus.PENDING]: "미업로드",
  [GroupDealReceiptStatus.UPLOADED]: "업로드됨(미검증)",
  [GroupDealReceiptStatus.VERIFIED]: "검증 완료",
  [GroupDealReceiptStatus.REJECTED]: "거절됨",
}

const RECEIPT_AI_STATUS_LABELS: Record<string, string> = {
  [GroupDealDocumentAiStatus.NOT_REQUESTED]: "분석 요청 없음",
  [GroupDealDocumentAiStatus.PROCESSING]: "분석 중",
  [GroupDealDocumentAiStatus.PARSED]: "분석 완료",
  [GroupDealDocumentAiStatus.NEEDS_REVIEW]: "검토 필요",
  [GroupDealDocumentAiStatus.FAILED]: "분석 실패",
}

const VALIDATION_REASON_LABELS: Record<string, string> = {
  ORDER_NUMBER_MISSING: "주문번호를 찾을 수 없습니다",
  SELLER_MISMATCH: "선언한 판매처와 영수증 판매처가 일치하지 않습니다",
  ORDER_BEFORE_ALL_PAID:
    "영수증 주문 시각이 참여자 결제 완료 시각보다 이릅니다",
  ALBUM_QUANTITY_INSUFFICIENT:
    "영수증 수량이 공구 선언 수량보다 적습니다",
  STRUCTURED_RECEIPT_MISSING:
    "영수증에서 구조화된 필드를 추출하지 못했습니다",
}

type PurchaseReceiptGuardDeal = {
  purchase_receipt_status?: string | null
  purchase_receipt_url?: string | null
  receipt_ai_status?: string | null
  receipt_ai_confidence?: number | null
  receipt_ai_result?: Record<string, unknown> | null
}

const readValidationReasons = (
  receiptAiResult: Record<string, unknown> | null | undefined
): string[] => {
  const validation = receiptAiResult?.validation

  if (!validation || typeof validation !== "object") {
    return []
  }

  const reasons = (validation as { reasons?: unknown }).reasons

  if (!Array.isArray(reasons)) {
    return []
  }

  return reasons.map((reason) => {
    const code = String(reason)
    return VALIDATION_REASON_LABELS[code] ?? code
  })
}

const readAiErrorMessage = (
  receiptAiResult: Record<string, unknown> | null | undefined
): string | null => {
  const message = receiptAiResult?.error_message

  return typeof message === "string" && message.trim() ? message.trim() : null
}

export const buildPurchaseReceiptShippingBlockMessage = (
  deal: PurchaseReceiptGuardDeal
): string => {
  const status = String(
    deal.purchase_receipt_status ?? GroupDealReceiptStatus.PENDING
  )
  const aiStatus = String(
    deal.receipt_ai_status ?? GroupDealDocumentAiStatus.NOT_REQUESTED
  )
  const statusLabel = RECEIPT_STATUS_LABELS[status] ?? status
  const aiStatusLabel = RECEIPT_AI_STATUS_LABELS[aiStatus] ?? aiStatus
  const validationReasons = readValidationReasons(deal.receipt_ai_result)
  const aiErrorMessage = readAiErrorMessage(deal.receipt_ai_result)
  const autoVerifyThreshold = Math.round(
    getDocumentAiAutoVerifyConfidence() * 100
  )

  const lines = [
    "송장/배송은 1차 구매 영수증이 '검증 완료(verified)'일 때만 진행할 수 있습니다.",
    `현재 영수증 상태: ${statusLabel} (${status})`,
  ]

  if (status === GroupDealReceiptStatus.PENDING) {
    lines.push(
      "→ '1차 구매 증빙(PURC)' 화면에서 영수증을 먼저 업로드해 주세요."
    )
    return lines.join("\n")
  }

  if (status === GroupDealReceiptStatus.REJECTED) {
    lines.push(
      "→ 영수증이 거절되었습니다. 올바른 구매 증빙을 다시 업로드해 주세요."
    )
    return lines.join("\n")
  }

  if (status === GroupDealReceiptStatus.UPLOADED) {
    lines.push(`AI 분석 상태: ${aiStatusLabel} (${aiStatus})`)

    if (deal.receipt_ai_confidence != null) {
      lines.push(
        `AI 신뢰도: ${Math.round(deal.receipt_ai_confidence * 100)}% (자동 검증 기준 ${autoVerifyThreshold}%)`
      )
    }

    if (
      aiStatus === GroupDealDocumentAiStatus.NOT_REQUESTED ||
      aiStatus === GroupDealDocumentAiStatus.PROCESSING
    ) {
      lines.push(
        "→ 영수증 AI 분석이 아직 끝나지 않았습니다. PURC 화면에서 업로드·분석을 완료한 뒤 다시 시도해 주세요."
      )
    } else if (aiStatus === GroupDealDocumentAiStatus.FAILED) {
      lines.push(
        `→ 영수증 AI 분석에 실패했습니다.${
          aiErrorMessage ? ` (${aiErrorMessage})` : ""
        } PURC 화면에서 다시 업로드해 주세요.`
      )
    } else if (aiStatus === GroupDealDocumentAiStatus.NEEDS_REVIEW) {
      lines.push(
        "→ AI가 '검토 필요'로 분류했습니다. PURC 화면에서 분석 결과를 확인하고 다음 단계로 진행해 주세요."
      )
    } else if (aiStatus === GroupDealDocumentAiStatus.PARSED) {
      lines.push(
        "→ AI 분석은 완료됐지만 자동 검증 조건(주문번호·수량·판매처 등)을 충족하지 못해 verified로 전환되지 않았습니다."
      )
    }

    if (validationReasons.length) {
      lines.push(`검증 실패 사유: ${validationReasons.join(", ")}`)
    }

    if (!deal.purchase_receipt_url) {
      lines.push("→ 저장된 영수증 파일이 없습니다. PURC 화면에서 다시 업로드해 주세요.")
    }

    lines.push(
      "테스트용 가짜 송장/영수증은 업로드할 수 있지만, 이 단계 게이트는 영수증 verified 여부만 확인합니다."
    )

    return lines.join("\n")
  }

  lines.push("→ PURC(1차 구매 증빙) 단계를 완료한 뒤 다시 시도해 주세요.")
  return lines.join("\n")
}
