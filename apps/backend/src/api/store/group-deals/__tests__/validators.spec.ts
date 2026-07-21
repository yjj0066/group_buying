import { PostStoreApplyGroupDeal } from "../validators"

describe("PostStoreApplyGroupDeal", () => {
  const baseInput = {
    member_label: "민지",
    recipient_name: "홍길동",
    phone: "01012345678",
    address: "12345 서울시 강남구",
    country_code: "kr",
  }

  it("accepts apply payloads without option_id", () => {
    const parsed = PostStoreApplyGroupDeal.parse(baseInput)

    expect(parsed.option_id).toBeUndefined()
  })

  it("treats empty option_id as omitted", () => {
    const parsed = PostStoreApplyGroupDeal.parse({
      ...baseInput,
      option_id: "",
    })

    expect(parsed.option_id).toBeUndefined()
  })

  it("accepts a non-empty option_id", () => {
    const parsed = PostStoreApplyGroupDeal.parse({
      ...baseInput,
      option_id: "gopt_a",
    })

    expect(parsed.option_id).toBe("gopt_a")
  })
})
