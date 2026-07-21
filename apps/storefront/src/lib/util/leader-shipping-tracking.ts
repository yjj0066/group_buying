import { normalizeShippingCourier } from "@lib/constants/shipping-couriers"
import { loadLeaderDistributionDraft } from "@modules/group-buying/components/leader-purchase-proof/distribution-storage"
import { loadLeaderManualAllocationDraft } from "@modules/group-buying/components/leader-manual-distribution/storage"
import {
  filterDepositConfirmedParticipations,
  type LeaderDealParticipation,
} from "types/leader-deal-participation"

import { downloadCsvFile } from "./leader-order-finalize"

export type LeaderShippingParticipantRow = {
  participantId: string
  recipientName: string
  phone: string
  address: string
  memberLabel: string
  assignedQuantity: number
}

export type LeaderTrackingEntry = {
  courier: string
  trackingNumber: string
}

export type LeaderTrackingDraft = Record<string, LeaderTrackingEntry>

/** Only exclude participants who have not finished payment yet. */
const SHIPPING_EXCLUDED_STAGES = new Set(["recruiting"])

const escapeCsvCell = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value)

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export const resolveAssignedQuantity = (
  participation: LeaderDealParticipation
): number => {
  const assigned =
    participation.assigned_quantity ?? participation.quantity ?? 0

  return Number.isFinite(assigned) ? Math.max(0, assigned) : 0
}

const resolveDraftAssignedQuantity = (
  participation: LeaderDealParticipation,
  assignedByParticipantId: Map<string, number>
): number => {
  if (assignedByParticipantId.has(participation.participant_id)) {
    return assignedByParticipantId.get(participation.participant_id) ?? 0
  }

  return resolveAssignedQuantity(participation)
}

export const applyAllocationDraftsToParticipations = (
  dealId: string,
  participations: LeaderDealParticipation[]
): LeaderDealParticipation[] => {
  const manualDraft = loadLeaderManualAllocationDraft(dealId)

  if (manualDraft?.confirmedAt) {
    const assignedByParticipantId = new Map(
      manualDraft.allocations.map((entry) => [
        entry.participant_id,
        entry.assigned_quantity,
      ])
    )

    return participations.map((participation) => ({
      ...participation,
      assigned_quantity: resolveDraftAssignedQuantity(
        participation,
        assignedByParticipantId
      ),
      stage: participation.stage ?? "opening",
    }))
  }

  const distributionDraft = loadLeaderDistributionDraft(dealId)

  if (distributionDraft?.autoAllocation) {
    const assignedByParticipantId = new Map<string, number>()

    for (const entry of distributionDraft.autoAllocation.assigned) {
      assignedByParticipantId.set(entry.participantId, entry.assignedQuantity)
    }

    for (const entry of distributionDraft.autoAllocation.refunded) {
      assignedByParticipantId.set(entry.participantId, 0)
    }

    return participations.map((participation) => ({
      ...participation,
      assigned_quantity: resolveDraftAssignedQuantity(
        participation,
        assignedByParticipantId
      ),
      stage: participation.stage ?? "opening",
    }))
  }

  return participations.map((participation) => ({
    ...participation,
    assigned_quantity:
      participation.assigned_quantity ?? participation.quantity,
    stage: participation.stage ?? "opening",
  }))
}

export const filterAllocatedShippingParticipants = (
  participations: LeaderDealParticipation[]
): LeaderDealParticipation[] =>
  filterDepositConfirmedParticipations(participations).filter((participation) => {
    if (resolveAssignedQuantity(participation) <= 0) {
      return false
    }

    if (
      participation.stage &&
      SHIPPING_EXCLUDED_STAGES.has(participation.stage)
    ) {
      return false
    }

    return true
  })

export const toLeaderShippingParticipantRows = (
  participations: LeaderDealParticipation[]
): LeaderShippingParticipantRow[] =>
  filterAllocatedShippingParticipants(participations).map((participation) => ({
    participantId: participation.participant_id,
    recipientName: participation.recipient_name,
    phone: participation.phone,
    address: participation.address,
    memberLabel: participation.member_label,
    assignedQuantity: resolveAssignedQuantity(participation),
  }))

export const buildTrackingTemplateCsv = (
  rows: LeaderShippingParticipantRow[],
  labels: {
    nameColumn: string
    phoneColumn: string
    addressColumn: string
    courierColumn: string
    trackingColumn: string
  }
): string => {
  const header = [
    labels.nameColumn,
    labels.phoneColumn,
    labels.addressColumn,
    labels.courierColumn,
    labels.trackingColumn,
  ]
    .map(escapeCsvCell)
    .join(",")

  const body = rows.map((row) =>
    [row.recipientName, row.phone, row.address, "", ""]
      .map(escapeCsvCell)
      .join(",")
  )

  return `\uFEFF${[header, ...body].join("\n")}`
}

export const downloadTrackingTemplateCsv = (
  filename: string,
  rows: LeaderShippingParticipantRow[],
  labels: Parameters<typeof buildTrackingTemplateCsv>[1]
) => {
  downloadCsvFile(filename, buildTrackingTemplateCsv(rows, labels))
}

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }

      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())

  return cells
}

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "")

const findColumnIndex = (headers: string[], candidates: string[]) => {
  const normalizedHeaders = headers.map(normalizeHeader)

  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(normalizeHeader(candidate))

    if (index >= 0) {
      return index
    }
  }

  return -1
}

export type ParsedTrackingUploadRow = {
  recipientName: string
  phone: string
  address: string
  courier: string
  trackingNumber: string
}

export const parseTrackingUploadCsv = (
  content: string
): ParsedTrackingUploadRow[] => {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return []
  }

  const headerCells = parseCsvLine(lines[0])
  const nameIndex = findColumnIndex(headerCells, [
    "name",
    "recipient_name",
    "이름",
    "수령인",
  ])
  const phoneIndex = findColumnIndex(headerCells, ["phone", "연락처", "전화"])
  const addressIndex = findColumnIndex(headerCells, [
    "address",
    "배송지",
    "주소",
  ])
  const courierIndex = findColumnIndex(headerCells, [
    "courier",
    "carrier",
    "택배사",
  ])
  const trackingIndex = findColumnIndex(headerCells, [
    "tracking_number",
    "tracking",
    "운송장",
    "송장번호",
  ])

  const dataLines =
    nameIndex >= 0 ||
    phoneIndex >= 0 ||
    addressIndex >= 0 ||
    courierIndex >= 0 ||
    trackingIndex >= 0
      ? lines.slice(1)
      : lines

  return dataLines.map((line) => {
    const cells = parseCsvLine(line)

    const readCell = (index: number, fallbackIndex: number) => {
      const resolvedIndex = index >= 0 ? index : fallbackIndex
      return cells[resolvedIndex]?.trim() ?? ""
    }

    const courierRaw =
      courierIndex >= 0 ? readCell(courierIndex, 3) : readCell(-1, 3)
    const normalizedCourier = normalizeShippingCourier(courierRaw)

    return {
      recipientName:
        nameIndex >= 0 ? readCell(nameIndex, 0) : readCell(-1, 0),
      phone: phoneIndex >= 0 ? readCell(phoneIndex, 1) : readCell(-1, 1),
      address:
        addressIndex >= 0 ? readCell(addressIndex, 2) : readCell(-1, 2),
      courier: normalizedCourier ?? "",
      trackingNumber:
        trackingIndex >= 0
          ? readCell(trackingIndex, 4)
          : readCell(-1, 4),
    }
  })
}

export const mergeTrackingUploadRows = (
  participants: LeaderShippingParticipantRow[],
  uploadRows: ParsedTrackingUploadRow[],
  currentDraft: LeaderTrackingDraft
): LeaderTrackingDraft => {
  const nextDraft: LeaderTrackingDraft = { ...currentDraft }

  uploadRows.forEach((uploadRow, index) => {
    const matchedParticipant =
      participants.find(
        (participant) =>
          participant.recipientName.trim() === uploadRow.recipientName.trim()
      ) ?? participants[index]

    if (!matchedParticipant) {
      return
    }

    const existing = nextDraft[matchedParticipant.participantId] ?? {
      courier: "",
      trackingNumber: "",
    }

    nextDraft[matchedParticipant.participantId] = {
      courier: uploadRow.courier || existing.courier,
      trackingNumber: uploadRow.trackingNumber || existing.trackingNumber,
    }
  })

  return nextDraft
}

export const validateTrackingDraft = (
  participants: LeaderShippingParticipantRow[],
  draft: LeaderTrackingDraft
): { ok: true } | { ok: false; missingParticipantIds: string[] } => {
  const missingParticipantIds = participants
    .filter((participant) => {
      const entry = draft[participant.participantId]
      return !entry?.courier?.trim() || !entry?.trackingNumber?.trim()
    })
    .map((participant) => participant.participantId)

  if (missingParticipantIds.length) {
    return { ok: false, missingParticipantIds }
  }

  return { ok: true }
}

export const createInitialTrackingDraft = (
  participants: LeaderShippingParticipantRow[],
  existing?: LeaderTrackingDraft
): LeaderTrackingDraft => {
  const draft: LeaderTrackingDraft = { ...(existing ?? {}) }

  for (const participant of participants) {
    if (!draft[participant.participantId]) {
      draft[participant.participantId] = {
        courier: "",
        trackingNumber: "",
      }
    }
  }

  return draft
}
