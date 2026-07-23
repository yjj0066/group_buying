import {
  buildFlaskDocumentInput,
  describeInvalidFlaskResponse,
} from "../flask-document-ai-client"
import { buildPublicStaticUrl } from "../hybrid-api-config"

describe("flask-document-ai-client", () => {
  const originalBackendUrl = process.env.MEDUSA_BACKEND_URL

  beforeEach(() => {
    process.env.MEDUSA_BACKEND_URL = "https://group-buying-2hlq.onrender.com"
  })

  afterEach(() => {
    if (originalBackendUrl === undefined) {
      delete process.env.MEDUSA_BACKEND_URL
    } else {
      process.env.MEDUSA_BACKEND_URL = originalBackendUrl
    }
  })

  it("prefers input_url and drops base64 when stored path is available", () => {
    const result = buildFlaskDocumentInput({
      partner_group_deal_id: "gd_1",
      stored_document_url: "/static/group-deals/gd_1/receipt.png",
      input_base64: "data:image/png;base64,AAAA",
      input_file_name: "receipt.png",
    })

    expect(result.input_url).toBe(
      "https://group-buying-2hlq.onrender.com/static/group-deals/gd_1/receipt.png"
    )
    expect(result.input_base64).toBeNull()
    expect(result.input_file_name).toBe("receipt.png")
  })

  it("keeps base64 when no public URL can be built", () => {
    delete process.env.MEDUSA_BACKEND_URL

    const result = buildFlaskDocumentInput({
      partner_group_deal_id: "gd_1",
      input_base64: "data:image/png;base64,AAAA",
      input_file_name: "receipt.png",
    })

    expect(result.input_url).toBeUndefined()
    expect(result.input_base64).toBe("data:image/png;base64,AAAA")
  })

  it("describes HTML gateway errors in Korean", () => {
    const message = describeInvalidFlaskResponse(
      502,
      "<html><body>Bad Gateway</body></html>"
    )

    expect(message).toContain("일시적으로 응답하지 않습니다")
    expect(message).toContain("502")
  })

  it("describes auth failures with secret hint", () => {
    const message = describeInvalidFlaskResponse(401, '{"message":"Unauthorized"}')

    expect(message).toContain("HYBRID_API_SHARED_SECRET")
  })

  it("buildPublicStaticUrl joins backend base with static path", () => {
    expect(buildPublicStaticUrl("/static/receipt.png")).toBe(
      "https://group-buying-2hlq.onrender.com/static/receipt.png"
    )
  })
})
