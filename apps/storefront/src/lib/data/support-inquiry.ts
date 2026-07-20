"use client"

export type SupportInquiryRecord = {
  id: string
  subject: string
  message: string
  dealId: string | null
  participantId: string | null
  createdAt: string
}

const INQUIRY_STORAGE_KEY = "gb-support-inquiries"

export async function submitSupportInquiry(input: {
  subject: string
  message: string
  dealId?: string | null
  participantId?: string | null
}): Promise<SupportInquiryRecord> {
  const record: SupportInquiryRecord = {
    id: `inquiry-${Date.now()}`,
    subject: input.subject.trim(),
    message: input.message.trim(),
    dealId: input.dealId ?? null,
    participantId: input.participantId ?? null,
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem(INQUIRY_STORAGE_KEY)
    const existing = raw ? (JSON.parse(raw) as SupportInquiryRecord[]) : []
    sessionStorage.setItem(
      INQUIRY_STORAGE_KEY,
      JSON.stringify([record, ...existing])
    )
  }

  return record
}
