"use client"

export type DisputeRecord = {
  id: string
  dealId: string
  dealTitle: string | null
  participantId: string | null
  transactionId: string | null
  reason: string
  details: string | null
  settlementHold: true
  status: "open"
  createdAt: string
}

const DISPUTE_STORAGE_KEY = "gb-dispute-records"

const readRecords = (): DisputeRecord[] => {
  if (typeof window === "undefined") {
    return []
  }

  const raw = sessionStorage.getItem(DISPUTE_STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as DisputeRecord[]

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeRecords = (records: DisputeRecord[]) => {
  sessionStorage.setItem(DISPUTE_STORAGE_KEY, JSON.stringify(records))
}

export const getDisputeRecords = (): DisputeRecord[] => readRecords()

export const isDealSettlementHeld = (dealId: string): boolean =>
  readRecords().some(
    (record) => record.dealId === dealId && record.settlementHold
  )

export const registerDisputeSettlementHold = (input: {
  dealId: string
  dealTitle?: string | null
  participantId?: string | null
  transactionId?: string | null
  reason: string
  details?: string | null
}): DisputeRecord => {
  const record: DisputeRecord = {
    id: `dispute-${Date.now()}`,
    dealId: input.dealId,
    dealTitle: input.dealTitle ?? null,
    participantId: input.participantId ?? null,
    transactionId: input.transactionId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
    settlementHold: true,
    status: "open",
    createdAt: new Date().toISOString(),
  }

  const existing = readRecords().filter((item) => item.dealId !== input.dealId)
  writeRecords([record, ...existing])

  return record
}
