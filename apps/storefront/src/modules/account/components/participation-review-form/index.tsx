"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { submitParticipationReview } from "@lib/data/account-group-deals"
import { useDictionary } from "@i18n/provider"
import { Button, Label, Text } from "@modules/common/components/ui"

type ParticipationReviewFormProps = {
  participantId: string
}

const ParticipationReviewForm = ({
  participantId,
}: ParticipationReviewFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await submitParticipationReview(participantId, {
        rating,
        comment: comment.trim() || undefined,
      })
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.participations.reviewError
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Text className="text-sm text-emerald-700">
        {t.account.participations.reviewSuccess}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="review-rating">
          {t.account.participations.reviewRatingLabel}
        </Label>
        <select
          id="review-rating"
          className="h-10 rounded-md border border-ui-border-base bg-ui-bg-base px-3 text-sm"
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {t.account.participations.reviewRatingOption.replace(
                "{rating}",
                String(value)
              )}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="review-comment">
          {t.account.participations.reviewCommentLabel}
        </Label>
        <textarea
          id="review-comment"
          className="min-h-24 rounded-md border border-ui-border-base px-3 py-2 text-sm"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t.account.participations.reviewCommentPlaceholder}
        />
      </div>

      {error && <Text className="text-sm text-red-600">{error}</Text>}

      <Button onClick={handleSubmit} disabled={submitting} size="small">
        {submitting
          ? t.account.participations.reviewSubmitting
          : t.account.participations.reviewSubmit}
      </Button>
    </div>
  )
}

export default ParticipationReviewForm
