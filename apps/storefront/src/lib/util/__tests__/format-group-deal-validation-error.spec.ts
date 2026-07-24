import { formatGroupDealValidationError } from "@lib/util/format-group-deal-validation-error"

describe("formatGroupDealValidationError", () => {
  it("passes through unknown server messages instead of a generic fallback", () => {
    expect(
      formatGroupDealValidationError(
        "Group deal creation failed on the server."
      )
    ).toContain("공구 생성 중 서버 오류")
  })

  it("translates missing demo product errors", () => {
    expect(
      formatGroupDealValidationError(
        "Product with id demo-product-group-buy was not found"
      )
    ).toContain("공구에 연결할 상품을 찾을 수 없습니다")
  })

  it("translates unauthorized responses", () => {
    expect(formatGroupDealValidationError("Unauthorized.")).toContain(
      "로그인이 필요합니다"
    )
  })
})
