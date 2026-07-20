"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { submitSupportInquiry } from "@lib/data/support-inquiry"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbSectionHeader,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"

type MySupportInquiryViewProps = {
  countryCode: string
  dealOptions: Array<{ dealId: string; title: string }>
}

const MySupportInquiryView = ({
  countryCode,
  dealOptions,
}: MySupportInquiryViewProps) => {
  const t = useDictionary()
  const cs = t.account.customerService
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialDealId = searchParams.get("dealId") ?? ""
  const initialParticipantId = searchParams.get("participantId") ?? ""

  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [dealId, setDealId] = useState(initialDealId)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDealTitle = useMemo(
    () => dealOptions.find((option) => option.dealId === dealId)?.title ?? null,
    [dealId, dealOptions]
  )

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(cs.inquiryMessageRequired)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitSupportInquiry({
        subject: subject.trim() || cs.inquiryTitle,
        message: message.trim(),
        dealId: dealId || null,
        participantId: initialParticipantId || null,
      })
      setSuccess(true)
    } catch {
      setError(cs.inquiryError)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <BbCard padding="md">
          <Text className="text-sm font-semibold text-emerald-700">
            {cs.inquirySuccess}
          </Text>
          {selectedDealTitle ? (
            <Text className="mt-2 text-xs text-[var(--bb-mute)]">
              {cs.inquiryDealLabel}: {selectedDealTitle}
            </Text>
          ) : null}
        </BbCard>
        <BbButton
          variant="secondary"
          fullWidth
          onClick={() => router.push(gbAppRoutes.mySupport(countryCode))}
        >
          {cs.backToSupport}
        </BbButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LocalizedClientLink href={gbAppRoutes.mySupport(countryCode)}>
        <BbButton variant="secondary" size="sm">
          {cs.backToSupport}
        </BbButton>
      </LocalizedClientLink>

      <BbSectionHeader title={cs.inquiryTitle} subtitle={cs.inquiryDescription} />

      {dealOptions.length > 0 ? (
        <label className="flex flex-col gap-1.5">
          <Text className="text-xs font-semibold text-[var(--bb-mute)]">
            {cs.inquiryDealLabel}
          </Text>
          <select
            value={dealId}
            onChange={(event) => setDealId(event.target.value)}
            className="bb-input w-full"
          >
            <option value="">{cs.inquiryDealPlaceholder}</option>
            {dealOptions.map((option) => (
              <option key={option.dealId} value={option.dealId}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <Text className="text-xs font-semibold text-[var(--bb-mute)]">
          {cs.inquirySubjectLabel}
        </Text>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={cs.inquirySubjectPlaceholder}
          className="bb-input w-full"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <Text className="text-xs font-semibold text-[var(--bb-mute)]">
          {cs.inquiryMessageLabel}
        </Text>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={cs.inquiryMessagePlaceholder}
          rows={6}
          className="bb-input w-full resize-y"
        />
      </label>

      {error ? <BbAlert variant="error">{error}</BbAlert> : null}

      <BbButton
        fullWidth
        isLoading={submitting}
        onClick={handleSubmit}
      >
        {submitting ? cs.inquirySubmitting : cs.inquirySubmit}
      </BbButton>
    </div>
  )
}

export default MySupportInquiryView
