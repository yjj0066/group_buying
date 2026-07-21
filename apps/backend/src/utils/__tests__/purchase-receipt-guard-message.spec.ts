import { buildPurchaseReceiptShippingBlockMessage } from "../purchase-receipt-guard-message"
import {
  GroupDealDocumentAiStatus,
  GroupDealReceiptStatus,
} from "../../types/group-buying"

describe("buildPurchaseReceiptShippingBlockMessage", () => {
  it("explains pending receipt", () => {
    const message = buildPurchaseReceiptShippingBlockMessage({
      purchase_receipt_status: GroupDealReceiptStatus.PENDING,
    })

    expect(message).toContain("미업로드")
    expect(message).toContain("PURC")
  })

  it("explains uploaded receipt with validation reasons", () => {
    const message = buildPurchaseReceiptShippingBlockMessage({
      purchase_receipt_status: GroupDealReceiptStatus.UPLOADED,
      receipt_ai_status: GroupDealDocumentAiStatus.NEEDS_REVIEW,
      receipt_ai_confidence: 0.72,
      receipt_ai_result: {
        validation: {
          passed: false,
          reasons: ["ALBUM_QUANTITY_INSUFFICIENT", "ORDER_NUMBER_MISSING"],
        },
      },
    })

    expect(message).toContain("업로드됨(미검증)")
    expect(message).toContain("검토 필요")
    expect(message).toContain("영수증 수량이 공구 선언 수량보다 적습니다")
    expect(message).toContain("주문번호를 찾을 수 없습니다")
  })
})
