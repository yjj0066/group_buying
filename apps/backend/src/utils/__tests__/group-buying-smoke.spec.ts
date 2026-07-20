import {
  runPhase7SmokeChecks,
  summarizePhase7SmokeChecks,
} from "../group-buying-phase7-checks"

describe("group-buying Phase 7 smoke", () => {
  const checks = runPhase7SmokeChecks()
  const summary = summarizePhase7SmokeChecks(checks)

  it.each(checks.map((check) => [check.id, check.label, check.pass]))(
    "%s — %s",
    (_id, _label, pass) => {
      expect(pass).toBe(true)
    }
  )

  it("runs all Phase 7 checklist items", () => {
    expect(summary.total).toBeGreaterThanOrEqual(11)
    expect(summary.failed).toBe(0)
  })
})
