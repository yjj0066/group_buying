import { normalizeShippingCourier } from "@lib/constants/shipping-couriers"
import { maskRecipientName } from "@lib/util/leader-shipping-conflicts"
import type { LeaderShippingParticipantRow } from "@lib/util/leader-shipping-tracking"
import type { StructuredInvoiceRow } from "types/group-deal-document-ai"

export type ShippingMatchStatus = "complete" | "needs_review" | "unmatched"

export type ShippingMatchReviewReason =
  | "tracking_missing"
  | "carrier_missing"
  | "low_confidence"
  | "ai_needs_review"
  | "ambiguous_participant"
  | "duplicate_recipient_in_upload"
  | "no_participant_match"
  | "not_matched_from_upload"
  | "duplicate_participant_profile"
  | "manual_incomplete"

export type ShippingMatchTableRow = {
  id: string
  participantId: string | null
  recipientLabel: string
  trackingNumber: string
  carrier: string
  status: ShippingMatchStatus
  source: "ai" | "manual"
  reviewReasons: ShippingMatchReviewReason[]
}

export type ShippingMatchSummary = {
  complete: number
  needsReview: number
  unmatched: number
}

export type ShippingMatchReviewReasonLabels = Record<
  ShippingMatchReviewReason,
  string
>

const normalizeName = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, "")

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, "")

const extractPostalCode = (value: string): string | null => {
  const match = value.match(/\d{5}/)

  return match?.[0] ?? null
}

const scoreNameMatch = (
  recipientName: string | null | undefined,
  participantName: string
): number => {
  const recipient = normalizeName(recipientName)
  const participant = normalizeName(participantName)

  if (!recipient || !participant) {
    return 0
  }

  if (recipient === participant) {
    return 100
  }

  if (recipient.includes(participant) || participant.includes(recipient)) {
    return 80
  }

  return 0
}

const scoreAddressMatch = (
  addressHint: string | null | undefined,
  participantAddress: string
): number => {
  const hint = normalizeAddress(addressHint)
  const address = normalizeAddress(participantAddress)

  if (!hint || !address) {
    return 0
  }

  if (address.includes(hint) || hint.includes(address)) {
    return 80
  }

  const hintPostal = extractPostalCode(hint)
  const addressPostal = extractPostalCode(address)

  if (hintPostal && addressPostal && hintPostal === addressPostal) {
    return 60
  }

  return 0
}

type ParticipantMatchResult =
  | {
      kind: "single"
      participant: LeaderShippingParticipantRow
    }
  | {
      kind: "ambiguous"
      candidates: LeaderShippingParticipantRow[]
    }
  | {
      kind: "none"
    }

const resolveParticipantMatch = (
  row: StructuredInvoiceRow,
  participants: LeaderShippingParticipantRow[]
): ParticipantMatchResult => {
  const nameCandidates = participants.filter(
    (participant) =>
      scoreNameMatch(row.recipient_name, participant.recipientName) >= 80
  )

  if (nameCandidates.length === 0) {
    return { kind: "none" }
  }

  if (nameCandidates.length === 1) {
    return { kind: "single", participant: nameCandidates[0] }
  }

  const addressHint = row.address_hint?.trim()

  if (addressHint) {
    const addressMatches = nameCandidates.filter(
      (participant) => scoreAddressMatch(addressHint, participant.address) > 0
    )

    if (addressMatches.length === 1) {
      return { kind: "single", participant: addressMatches[0] }
    }

    if (addressMatches.length > 1) {
      return { kind: "ambiguous", candidates: addressMatches }
    }
  }

  return { kind: "ambiguous", candidates: nameCandidates }
}

const findParticipantMatches = (
  row: StructuredInvoiceRow,
  participants: LeaderShippingParticipantRow[]
): LeaderShippingParticipantRow[] => {
  const resolved = resolveParticipantMatch(row, participants)

  if (resolved.kind === "single") {
    return [resolved.participant]
  }

  if (resolved.kind === "ambiguous") {
    return resolved.candidates
  }

  return []
}

const collectMatchedRowReviewReasons = (
  invoiceRow: StructuredInvoiceRow,
  trackingNumber: string,
  carrier: string
): ShippingMatchReviewReason[] => {
  const reasons: ShippingMatchReviewReason[] = []

  if (!trackingNumber) {
    reasons.push("tracking_missing")
  }

  if (!carrier) {
    reasons.push("carrier_missing")
  }

  if (invoiceRow.needs_review && trackingNumber) {
    reasons.push("ai_needs_review")
  }

  if ((invoiceRow.confidence ?? 1) < 0.85) {
    reasons.push("low_confidence")
  }

  return reasons
}

const resolveManualIncompleteReasons = (
  trackingNumber: string,
  carrier: string
): ShippingMatchReviewReason[] => {
  const reasons: ShippingMatchReviewReason[] = []

  if (!trackingNumber.trim()) {
    reasons.push("tracking_missing")
  }

  if (!carrier.trim()) {
    reasons.push("carrier_missing")
  }

  if (reasons.length === 0) {
    reasons.push("manual_incomplete")
  }

  return reasons
}

const participantProfileKey = (
  participant: LeaderShippingParticipantRow
): string => {
  const name = normalizeName(participant.recipientName)
  const address = normalizeAddress(participant.address)
  const phone = (participant.phone ?? "").replace(/\D/g, "")

  return `${name}|${address}|${phone}`
}

export const findDuplicateParticipantProfileGroups = (
  participants: LeaderShippingParticipantRow[]
): LeaderShippingParticipantRow[][] => {
  const groups = new Map<string, LeaderShippingParticipantRow[]>()

  participants.forEach((participant) => {
    const key = participantProfileKey(participant)

    if (!normalizeName(participant.recipientName)) {
      return
    }

    const existing = groups.get(key) ?? []
    existing.push(participant)
    groups.set(key, existing)
  })

  return [...groups.values()].filter((group) => group.length > 1)
}

export const compactMatchRowsForState = (
  rows: ShippingMatchTableRow[]
): ShippingMatchTableRow[] =>
  rows.filter(
    (row) =>
      !row.participantId ||
      row.source === "ai" ||
      row.trackingNumber.trim().length > 0 ||
      row.carrier.trim().length > 0
  )

const preferMatchRow = (
  candidate: ShippingMatchTableRow,
  current: ShippingMatchTableRow
): boolean => {
  if (candidate.source === "ai" && current.source !== "ai") {
    return true
  }

  if (candidate.trackingNumber.trim() && !current.trackingNumber.trim()) {
    return true
  }

  if (candidate.carrier.trim() && !current.carrier.trim()) {
    return true
  }

  return false
}

export const mergeParticipantMatchRows = (
  participants: LeaderShippingParticipantRow[],
  matchRows: ShippingMatchTableRow[]
): ShippingMatchTableRow[] => {
  const orphanRows = matchRows.filter((row) => !row.participantId)
  const participantRowsInState = matchRows.filter((row) => row.participantId)

  return [
    ...buildParticipantManualRows(participants, participantRowsInState),
    ...orphanRows,
  ]
}

export const buildShippingMatchSummary = (
  rows: ShippingMatchTableRow[]
): ShippingMatchSummary =>
  rows.reduce<ShippingMatchSummary>(
    (summary, row) => {
      if (row.status === "complete") {
        summary.complete += 1
      } else if (row.status === "needs_review") {
        summary.needsReview += 1
      } else {
        summary.unmatched += 1
      }

      return summary
    },
    { complete: 0, needsReview: 0, unmatched: 0 }
  )

export const mergeInvoiceRowsIntoMatchTable = (
  participants: LeaderShippingParticipantRow[],
  invoiceRows: StructuredInvoiceRow[],
  existingRows: ShippingMatchTableRow[] = []
): ShippingMatchTableRow[] => {
  const nextRows = compactMatchRowsForState([...existingRows])
  const batchAssignedParticipantIds = new Set<string>()

  invoiceRows.forEach((invoiceRow, index) => {
    const matches = findParticipantMatches(invoiceRow, participants)
    const trackingNumber = (invoiceRow.tracking_number ?? "").trim()
    const carrier =
      normalizeShippingCourier(invoiceRow.carrier ?? "") ??
      invoiceRow.carrier ??
      ""

    if (matches.length === 1) {
      const participant = matches[0]

      if (batchAssignedParticipantIds.has(participant.participantId)) {
        return
      }

      batchAssignedParticipantIds.add(participant.participantId)

      for (let rowIndex = nextRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
        if (nextRows[rowIndex].participantId === participant.participantId) {
          nextRows.splice(rowIndex, 1)
        }
      }

      const reviewReasons = collectMatchedRowReviewReasons(
        invoiceRow,
        trackingNumber,
        carrier
      )
      const isComplete = reviewReasons.length === 0

      nextRows.push({
        id: `ai-${participant.participantId}-${index}`,
        participantId: participant.participantId,
        recipientLabel: maskRecipientName(participant.recipientName),
        trackingNumber,
        carrier,
        status: isComplete ? "complete" : "needs_review",
        source: "ai",
        reviewReasons,
      })
      return
    }

    const reviewReasons: ShippingMatchReviewReason[] =
      matches.length > 1
        ? ["ambiguous_participant"]
        : ["no_participant_match"]

    if (!trackingNumber) {
      reviewReasons.push("tracking_missing")
    }

    if (!carrier) {
      reviewReasons.push("carrier_missing")
    }

    nextRows.push({
      id: `ai-unmatched-${index}-${Date.now()}`,
      participantId: null,
      recipientLabel: maskRecipientName(invoiceRow.recipient_name ?? "수령인"),
      trackingNumber,
      carrier,
      status: matches.length > 1 ? "needs_review" : "unmatched",
      source: "ai",
      reviewReasons,
    })
  })

  return nextRows
}

export const buildParticipantManualRows = (
  participants: LeaderShippingParticipantRow[],
  matchRows: ShippingMatchTableRow[]
): ShippingMatchTableRow[] => {
  const byParticipantId = new Map<string, ShippingMatchTableRow>()

  matchRows
    .filter((row) => row.participantId)
    .forEach((row) => {
      const participantId = row.participantId as string
      const existing = byParticipantId.get(participantId)

      if (!existing || preferMatchRow(row, existing)) {
        byParticipantId.set(participantId, row)
      }
    })

  const resolveUnmatchedParticipantReasons = (
    participant: LeaderShippingParticipantRow
  ): ShippingMatchReviewReason[] => {
    const reasons: ShippingMatchReviewReason[] = ["not_matched_from_upload"]
    const normalizedName = normalizeName(participant.recipientName)

    if (!normalizedName) {
      return reasons
    }

    const duplicateNameCount = participants.filter(
      (other) => normalizeName(other.recipientName) === normalizedName
    ).length

    if (duplicateNameCount > 1) {
      reasons.push("ambiguous_participant")
    }

    const profileKey = participantProfileKey(participant)
    const duplicateProfileCount = participants.filter(
      (other) => participantProfileKey(other) === profileKey
    ).length

    if (duplicateProfileCount > 1) {
      reasons.push("duplicate_participant_profile")
    }

    return reasons
  }

  return participants.map((participant) => {
    const existing = byParticipantId.get(participant.participantId)

    if (existing) {
      return existing
    }

    return {
      id: `manual-${participant.participantId}`,
      participantId: participant.participantId,
      recipientLabel: maskRecipientName(participant.recipientName),
      trackingNumber: "",
      carrier: "",
      status: "needs_review",
      source: "manual",
      reviewReasons: resolveUnmatchedParticipantReasons(participant),
    }
  })
}

export const applyManualTrackingPatch = (
  rows: ShippingMatchTableRow[],
  participantId: string,
  patch: { trackingNumber?: string; carrier?: string },
  participants: LeaderShippingParticipantRow[] = []
): ShippingMatchTableRow[] => {
  const target = participants.find(
    (participant) => participant.participantId === participantId
  )
  const duplicateGroup = target
    ? findDuplicateParticipantProfileGroups(participants).find((group) =>
        group.some((participant) => participant.participantId === participantId)
      )
    : undefined
  const participantIdsToUpdate =
    duplicateGroup?.map((participant) => participant.participantId) ?? [
      participantId,
    ]

  return rows.map((row) => {
    if (
      !row.participantId ||
      !participantIdsToUpdate.includes(row.participantId)
    ) {
      return row
    }

    const trackingNumber = patch.trackingNumber ?? row.trackingNumber
    const carrier = patch.carrier ?? row.carrier
    const isComplete =
      Boolean(trackingNumber.trim()) && Boolean(carrier.trim())

    return {
      ...row,
      trackingNumber,
      carrier,
      status: isComplete ? "complete" : "needs_review",
      source: "manual",
      reviewReasons: isComplete
        ? []
        : resolveManualIncompleteReasons(trackingNumber, carrier),
    }
  })
}

export const toTrackingDraftFromMatchRows = (
  rows: ShippingMatchTableRow[]
): Record<string, { courier: string; trackingNumber: string }> => {
  const draft: Record<string, { courier: string; trackingNumber: string }> = {}

  rows.forEach((row) => {
    if (!row.participantId) {
      return
    }

    draft[row.participantId] = {
      courier: row.carrier,
      trackingNumber: row.trackingNumber,
    }
  })

  return draft
}

export const getMatchTableDisplayRows = (
  matchRows: ShippingMatchTableRow[]
): ShippingMatchTableRow[] => {
  const participantRows = matchRows.filter((row) => row.participantId)
  const unmatchedRows = matchRows.filter((row) => !row.participantId)

  return [...participantRows, ...unmatchedRows]
}

export const matchStatusLabel = (
  status: ShippingMatchStatus,
  labels: {
    complete: string
    needsReview: string
    unmatched: string
  }
): string => {
  if (status === "complete") {
    return labels.complete
  }

  if (status === "unmatched") {
    return labels.unmatched
  }

  return labels.needsReview
}

export const formatMatchReviewReasons = (
  reasons: ShippingMatchReviewReason[],
  labels: ShippingMatchReviewReasonLabels
): string => {
  const uniqueReasons = [...new Set(reasons)]

  return uniqueReasons.map((reason) => labels[reason]).join(" · ")
}

export const formatMatchStatusWithReasons = (
  row: Pick<ShippingMatchTableRow, "status" | "reviewReasons">,
  labels: {
    complete: string
    needsReview: string
    unmatched: string
    reasonLabels: ShippingMatchReviewReasonLabels
  }
): string => {
  const statusLabel = matchStatusLabel(row.status, labels)

  if (row.status === "complete" || row.reviewReasons.length === 0) {
    return statusLabel
  }

  const reasonText = formatMatchReviewReasons(row.reviewReasons, labels.reasonLabels)

  return reasonText ? `${statusLabel}\n${reasonText}` : statusLabel
}
