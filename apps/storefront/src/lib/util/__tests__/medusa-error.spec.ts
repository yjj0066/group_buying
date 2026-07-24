import { FetchError } from "@medusajs/js-sdk"

import {
  isFetchError,
  resolveMedusaErrorMessage,
} from "@lib/util/medusa-error"

describe("medusa-error", () => {
  it("detects FetchError by duck typing when instanceof fails", () => {
    const error = Object.assign(new Error("An unknown error occurred."), {
      status: 500,
      statusText: "Internal Server Error",
    })

    expect(error instanceof FetchError).toBe(false)
    expect(isFetchError(error)).toBe(true)
  })

  it("maps generic 500 FetchError to a neutral server message", () => {
    const error = new FetchError(
      "An unknown error occurred.",
      "Internal Server Error",
      500
    )

    expect(resolveMedusaErrorMessage(error)).toContain(
      "서버 요청 처리에 실패했습니다"
    )
  })

  it("preserves purchase receipt guard messages", () => {
    const error = new FetchError(
      "송장/배송은 1차 구매 영수증이 '검증 완료(verified)'일 때만 진행할 수 있습니다.",
      "Bad Request",
      400
    )

    expect(resolveMedusaErrorMessage(error)).toContain("검증 완료(verified)")
  })

  it("preserves explicit backend error messages", () => {
    const error = new FetchError(
      "Document AI BFF is unreachable at http://127.0.0.1:5000",
      "Internal Server Error",
      500
    )

    expect(resolveMedusaErrorMessage(error)).toContain("Document AI BFF")
  })
})
