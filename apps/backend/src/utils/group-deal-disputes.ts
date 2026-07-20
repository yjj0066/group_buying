export type ParticipantDisputeEntry = {
  participant_id?: string | null
  status?: string | null
}

export const listParticipantDisputes = (
  metadata: Record<string, unknown> | null | undefined
): ParticipantDisputeEntry[] => {
  if (!metadata || !Array.isArray(metadata.participant_disputes)) {
    return []
  }

  return metadata.participant_disputes as ParticipantDisputeEntry[]
}

export const hasOpenParticipantDisputes = (
  metadata: Record<string, unknown> | null | undefined
): boolean => {
  return listParticipantDisputes(metadata).some(
    (entry) => String(entry.status ?? "") === "open"
  )
}

export const hasOpenParticipantDisputesForParticipant = (
  metadata: Record<string, unknown> | null | undefined,
  participantId: string
): boolean => {
  return listParticipantDisputes(metadata).some(
    (entry) =>
      String(entry.participant_id ?? "") === participantId &&
      String(entry.status ?? "") === "open"
  )
}
