import fs from "fs"
import path from "path"

import { PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3"
import { MedusaError } from "@medusajs/framework/utils"

export type GroupDealMediaFolder = "receipts" | "tracking" | "deal-images"

export const isObjectStorageConfigured = (): boolean =>
  Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_REGION?.trim() &&
      process.env.S3_FILE_URL?.trim()
  )

const sanitizeFilename = (filename: string, fallback: string) => {
  const rawSafeName =
    filename.replace(/[^a-zA-Z0-9._-]/g, "_") || fallback

  return rawSafeName.replace(/\.(png|jpe?g|gif|webp|pdf)$/i, "")
}

const buildStoredFilename = (
  filename: string,
  fallback: string,
  extension: string
) => `${Date.now()}-${sanitizeFilename(filename, fallback)}.${extension}`

const writeLocalGroupDealMedia = (input: {
  buffer: Buffer
  folder: GroupDealMediaFolder
  filename: string
  fallbackName: string
  extension: string
}): string => {
  const documentsDir = path.join(process.cwd(), "static", input.folder)

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true })
  }

  const storedFilename = buildStoredFilename(
    input.filename,
    input.fallbackName,
    input.extension
  )
  const absolutePath = path.join(documentsDir, storedFilename)

  fs.writeFileSync(absolutePath, input.buffer)

  return `/static/${input.folder}/${storedFilename}`
}

const buildS3Client = () => {
  const config: S3ClientConfig = {
    region: process.env.S3_REGION!,
  }

  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }
  }

  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT
    config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true"
  }

  return new S3Client(config)
}

const uploadObjectStorageGroupDealMedia = async (input: {
  buffer: Buffer
  folder: GroupDealMediaFolder
  filename: string
  fallbackName: string
  extension: string
  contentType: string
}): Promise<string> => {
  const prefix = (process.env.S3_PREFIX ?? "group-buying").replace(/^\/|\/$/g, "")
  const storedFilename = buildStoredFilename(
    input.filename,
    input.fallbackName,
    input.extension
  )
  const key = `${prefix}/${input.folder}/${storedFilename}`
  const client = buildS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      ...(process.env.S3_ACL === "false"
        ? {}
        : { ACL: "public-read" }),
    })
  )

  const baseUrl = process.env.S3_FILE_URL!.replace(/\/$/, "")

  return `${baseUrl}/${key}`
}

export const storeGroupDealMedia = async (input: {
  buffer: Buffer
  folder: GroupDealMediaFolder
  filename?: string
  fallbackName: string
  mimeType: string
}): Promise<string> => {
  const extension =
    input.mimeType === "application/pdf"
      ? "pdf"
      : input.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg"

  const filename = input.filename ?? input.fallbackName

  if (isObjectStorageConfigured()) {
    return uploadObjectStorageGroupDealMedia({
      buffer: input.buffer,
      folder: input.folder,
      filename,
      fallbackName: input.fallbackName,
      extension,
      contentType: input.mimeType,
    })
  }

  return writeLocalGroupDealMedia({
    buffer: input.buffer,
    folder: input.folder,
    filename,
    fallbackName: input.fallbackName,
    extension,
  })
}

export const parseGroupDealMediaBase64 = (imageBase64: string) => {
  const match = imageBase64.match(
    /^data:((?:image\/[a-zA-Z0-9.+-]+)|application\/pdf);base64,(.+)$/
  )

  if (!match) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "image_base64 must be a data URL (data:image/... or data:application/pdf;base64,...)"
    )
  }

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], "base64")

  return { mimeType, buffer }
}
