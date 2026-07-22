"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { submitParticipationDispute } from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { Button, Label, Text } from "@modules/common/components/ui"

type ParticipationDisputeFormProps = {
  participantId: string
}

const ParticipationDisputeForm = ({
  participantId,
}: ParticipationDisputeFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(t.account.participations.disputeReasonRequired)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitParticipationDispute(participantId, {
        reason: reason.trim(),
        details: details.trim() || undefined,
      })
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.participations.disputeError
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Text className="text-sm text-emerald-700">
        {t.account.participations.disputeSuccess}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="dispute-reason">
          {t.account.participations.disputeReasonLabel}
        </Label>
        <InputSelect
          id="dispute-reason"
          value={reason}
          onChange={setReason}
          options={t.account.participations.disputeReasonOptions}
          placeholder={t.account.participations.disputeReasonPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="dispute-details">
          {t.account.participations.disputeDetailsLabel}
        </Label>
        <textarea
          id="dispute-details"
          className="min-h-24 rounded-md border border-ui-border-base px-3 py-2 text-sm"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t.account.participations.disputeDetailsPlaceholder}
        />
      </div>

      {error && <Text className="text-sm text-red-600">{error}</Text>}

      <Button onClick={handleSubmit} disabled={submitting} size="small" variant="secondary">
        {submitting
          ? t.account.participations.disputeSubmitting
          : t.account.participations.disputeSubmit}
      </Button>
    </div>
  )
}

const InputSelect = ({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) => (
  <select
    id={id}
    className="h-10 rounded-md border border-ui-border-base bg-ui-bg-base px-3 text-sm"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
)

export default ParticipationDisputeForm
