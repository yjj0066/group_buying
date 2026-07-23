import { describe, expect, it } from "vitest"

import { formatGroupDealValidationError } from "@lib/util/format-group-deal-validation-error"
import {
  UPLOAD_SIZE_TOO_LARGE_MESSAGE,
  formatUploadSizeErrorMessage,
  isUploadSizeRelatedError,
} from "@lib/util/upload-size-error"

describe("upload-size-error", () => {
  it("detects payload too large errors", () => {
    expect(isUploadSizeRelatedError("request entity too large")).toBe(true)
    expect(formatUploadSizeErrorMessage("PayloadTooLargeError", 413)).toBe(
      UPLOAD_SIZE_TOO_LARGE_MESSAGE
    )
  })

  it("maps validation errors through formatGroupDealValidationError", () => {
    expect(
      formatGroupDealValidationError("request entity too large")
    ).toBe(UPLOAD_SIZE_TOO_LARGE_MESSAGE)
  })
})
