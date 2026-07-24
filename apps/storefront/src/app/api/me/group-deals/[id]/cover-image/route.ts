import { NextRequest, NextResponse } from "next/server"

import { getAuthHeaders } from "@lib/data/cookies"
import { estimateDataUrlBytes } from "@lib/util/upload-size-error"

/** Stay under Vercel serverless request body limits (~4.5MB). */
const MAX_COVER_BODY_BYTES = 3 * 1024 * 1024

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await context.params
    const headers = await getAuthHeaders()

    if (!("authorization" in headers) || !headers.authorization) {
      return NextResponse.json(
        { message: "로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요." },
        { status: 401 }
      )
    }

    const contentLength = Number(req.headers.get("content-length") || 0)

    if (contentLength > MAX_COVER_BODY_BYTES) {
      return NextResponse.json(
        {
          message:
            "사진 용량이 너무 큽니다. 더 작은 이미지로 다시 시도해 주세요.",
        },
        { status: 413 }
      )
    }

    const body = (await req.json()) as {
      image_base64?: string
      image_filename?: string | null
    }

    if (!body?.image_base64 || typeof body.image_base64 !== "string") {
      return NextResponse.json(
        { message: "이미지 데이터가 없습니다." },
        { status: 400 }
      )
    }

    if (estimateDataUrlBytes(body.image_base64) > 1.5 * 1024 * 1024) {
      return NextResponse.json(
        {
          message:
            "사진 용량이 너무 큽니다. 더 작은 이미지로 다시 시도해 주세요.",
        },
        { status: 413 }
      )
    }

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

    if (!backendUrl) {
      return NextResponse.json(
        { message: "백엔드 URL이 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    const upstream = await fetch(
      `${backendUrl.replace(/\/$/, "")}/store/me/group-deals/${dealId}/cover-image`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: headers.authorization,
          ...(publishableKey
            ? { "x-publishable-api-key": publishableKey }
            : {}),
        },
        body: JSON.stringify({
          image_base64: body.image_base64,
          image_filename: body.image_filename ?? null,
        }),
        cache: "no-store",
      }
    )

    const payload = await upstream.json().catch(() => ({}))

    if (!upstream.ok) {
      const message =
        typeof (payload as { message?: unknown }).message === "string"
          ? (payload as { message: string }).message
          : "커버 이미지 업로드에 실패했습니다."

      return NextResponse.json({ message }, { status: upstream.status })
    }

    return NextResponse.json({
      image_url:
        typeof (payload as { image_url?: unknown }).image_url === "string"
          ? (payload as { image_url: string }).image_url
          : null,
    })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "커버 이미지 업로드에 실패했습니다."

    return NextResponse.json({ message }, { status: 500 })
  }
}
