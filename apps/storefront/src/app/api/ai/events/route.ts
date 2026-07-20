import { NextRequest, NextResponse } from "next/server"

import { forwardFlaskBehaviorEvent } from "@lib/data/flask-behavior-log"
import type { FlaskBehaviorEvent } from "types/flask-behavior-log"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FlaskBehaviorEvent

    if (!body?.event_type) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    await forwardFlaskBehaviorEvent(body)
  } catch {
    // Always succeed from the storefront perspective
  }

  return NextResponse.json({ ok: true }, { status: 202 })
}
