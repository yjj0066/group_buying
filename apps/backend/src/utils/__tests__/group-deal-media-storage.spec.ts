import { buildPublicObjectUrl } from "../group-deal-media-storage"

describe("buildPublicObjectUrl", () => {
  const originalFileUrl = process.env.S3_FILE_URL
  const originalBucket = process.env.S3_BUCKET
  const originalForcePathStyle = process.env.S3_FORCE_PATH_STYLE

  afterEach(() => {
    if (originalFileUrl === undefined) {
      delete process.env.S3_FILE_URL
    } else {
      process.env.S3_FILE_URL = originalFileUrl
    }

    if (originalBucket === undefined) {
      delete process.env.S3_BUCKET
    } else {
      process.env.S3_BUCKET = originalBucket
    }

    if (originalForcePathStyle === undefined) {
      delete process.env.S3_FORCE_PATH_STYLE
    } else {
      process.env.S3_FORCE_PATH_STYLE = originalForcePathStyle
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

  it("includes the bucket segment for path-style R2 public URLs", () => {
    process.env.S3_FILE_URL = "https://pub-example.r2.dev"
    process.env.S3_BUCKET = "groupbuyingmedia"
    process.env.S3_FORCE_PATH_STYLE = "true"

    expect(
      buildPublicObjectUrl("group-buying/deal-images/cover.png")
    ).toBe(
      "https://pub-example.r2.dev/groupbuyingmedia/group-buying/deal-images/cover.png"
    )
  })

  it("includes the bucket segment for R2 public URLs without S3_FORCE_PATH_STYLE", () => {
    process.env.S3_FILE_URL = "https://pub-example.r2.dev"
    process.env.S3_BUCKET = "groupbuyingmedia"
    delete process.env.S3_FORCE_PATH_STYLE

    expect(
      buildPublicObjectUrl("group-buying/receipts/receipt.jpg")
    ).toBe(
      "https://pub-example.r2.dev/groupbuyingmedia/group-buying/receipts/receipt.jpg"
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
