import { NextRequest, NextResponse } from "next/server"

import { getRecommendationsViaAiEngine } from "@lib/data/ai-engine"

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "8")
  const customerId = request.nextUrl.searchParams.get("customer_id")

  const result = await getRecommendationsViaAiEngine({
    customerId,
    limit: Number.isFinite(limit) ? limit : 8,
  })

  if (!result) {
    return NextResponse.json(
      {
        policy: null,
        items: [],
        fallback: true,
      },
      { status: 200 }
    )
  }

  return NextResponse.json(result)
}
