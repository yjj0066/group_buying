import type { ExecArgs } from "@medusajs/framework/types"

import {
  runPhase7SmokeChecks,
  summarizePhase7SmokeChecks,
} from "../utils/group-buying-phase7-checks"

const printChecklist = (checks: ReturnType<typeof runPhase7SmokeChecks>) => {
  console.log("\n=== Group Buying Phase 7 Smoke Checklist ===\n")

  for (const check of checks) {
    const status = check.pass ? "PASS" : "FAIL"
    const detail = check.detail ? ` — ${check.detail}` : ""
    console.log(`[${status}] ${check.label}${detail}`)
  }
}

const pingHttpEndpoint = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: "GET" })

    return response.ok
  } catch {
    return false
  }
}

export default async function groupBuyingSmokeTest(_args: ExecArgs) {
  const checks = runPhase7SmokeChecks()
  const summary = summarizePhase7SmokeChecks(checks)

  printChecklist(checks)

  const baseUrl = process.env.SMOKE_HTTP_BASE_URL?.replace(/\/$/, "")

  if (baseUrl) {
    console.log("\n--- Optional HTTP probes ---\n")

    const groupDealsOk = await pingHttpEndpoint(`${baseUrl}/store/group-deals`)
    const searchIndexOk = await pingHttpEndpoint(
      `${baseUrl}/store/products/search-index`
    )

    console.log(
      `[${groupDealsOk ? "PASS" : "FAIL"}] GET /store/group-deals`
    )
    console.log(
      `[${searchIndexOk ? "PASS" : "FAIL"}] GET /store/products/search-index`
    )

    if (!groupDealsOk || !searchIndexOk) {
      process.exitCode = 1
    }
  }

  console.log(
    `\nResult: ${summary.passed}/${summary.total} passed, ${summary.failed} failed\n`
  )

  if (summary.failed > 0) {
    for (const failed of summary.failedChecks) {
      console.error(`FAILED: ${failed.label}`)
    }

    process.exitCode = 1
  }
}
