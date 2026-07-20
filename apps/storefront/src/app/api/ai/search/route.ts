import { NextRequest, NextResponse } from "next/server"

import { searchProducts } from "@lib/data/flask-search"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter q is required" },
      { status: 400 }
    )
  }

  const customerId = request.nextUrl.searchParams.get("customer_id")
  const result = await searchProducts(query, {
    customerId,
  })

  if (!result) {
    return NextResponse.json(
      {
        query,
        source: "unavailable",
        results: [],
        items: [],
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    query: result.query,
    source: result.source,
    model: result.model,
    semantic_engine: result.semanticEngine,
    synonym_expansion: result.synonymExpansion,
    product_ids: result.productIds,
    results: result.items,
  })
}
