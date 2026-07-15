import { NextRequest, NextResponse } from "next/server"

import { searchProductsViaAiEngine } from "@lib/data/ai-engine"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter q is required" },
      { status: 400 }
    )
  }

  const customerId = request.nextUrl.searchParams.get("customer_id")
  const result = await searchProductsViaAiEngine(query, {
    customerId,
  })

  if (!result) {
    return NextResponse.json(
      {
        query,
        source: "medusa",
        results: [],
        fallback: true,
      },
      { status: 200 }
    )
  }

  return NextResponse.json({
    query,
    source: result.source,
    model: result.model,
    product_ids: result.productIds,
  })
}
