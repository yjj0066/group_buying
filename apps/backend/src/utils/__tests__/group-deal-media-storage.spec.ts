import { buildPublicObjectUrl } from "../group-deal-media-storage"

describe("buildPublicObjectUrl", () => {
  const originalFileUrl = process.env.S3_FILE_URL

  afterEach(() => {
    if (originalFileUrl === undefined) {
      delete process.env.S3_FILE_URL
    } else {
      process.env.S3_FILE_URL = originalFileUrl
    }
  })

  it("builds a root public URL when S3_FILE_URL has no path prefix", () => {
    process.env.S3_FILE_URL = "https://pub-example.r2.dev"

    expect(
      buildPublicObjectUrl("group-buying/deal-images/cover.png")
    ).toBe(
      "https://pub-example.r2.dev/group-buying/deal-images/cover.png"
    )
  })

  it("does not duplicate the public path prefix", () => {
    process.env.S3_FILE_URL = "https://pub-example.r2.dev/group-buying"

    expect(
      buildPublicObjectUrl("group-buying/deal-images/cover.png")
    ).toBe(
      "https://pub-example.r2.dev/group-buying/deal-images/cover.png"
    )
  })

  it("prepends the public path prefix when the object key omits it", () => {
    process.env.S3_FILE_URL = "https://pub-example.r2.dev/group-buying"

    expect(buildPublicObjectUrl("deal-images/cover.png")).toBe(
      "https://pub-example.r2.dev/group-buying/deal-images/cover.png"
    )
  })
})
