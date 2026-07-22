"use client"



import { useMemo, useState } from "react"

import Image from "next/image"

import { useRouter } from "next/navigation"



import { submitParticipationReview } from "@lib/data/account-group-deals-actions"

import { useDictionary } from "@i18n/provider"

import { gbAppRoutes } from "@lib/wireframe/routes"

import { markParticipationReviewSubmitted } from "@lib/util/participation-status"

import {

  BbAlert,

  BbButton,

  BbCard,

  BbSectionHeader,

} from "@modules/design-system"

import StarRatingInput from "@modules/group-buying/components/star-rating-input"

import { Text } from "@modules/common/components/ui"

import type { AccountParticipation } from "types/account-group-deals"



const MIN_REVIEW_LENGTH = 10



type ParticipantReviewFormProps = {

  participation: AccountParticipation

  countryCode: string

}



type PhotoPreview = {

  id: string

  name: string

  url: string

}



const ParticipantReviewForm = ({

  participation,

  countryCode,

}: ParticipantReviewFormProps) => {

  const t = useDictionary()

  const router = useRouter()

  const labels = t.account.participations



  const [rating, setRating] = useState(5)

  const [comment, setComment] = useState("")

  const [photos, setPhotos] = useState<PhotoPreview[]>([])

  const [submitting, setSubmitting] = useState(false)

  const [success, setSuccess] = useState(false)

  const [validationError, setValidationError] = useState<string | null>(null)

  const [submitError, setSubmitError] = useState<string | null>(null)



  const trimmedComment = useMemo(() => comment.trim(), [comment])



  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {

    const files = Array.from(event.target.files ?? [])



    setPhotos((current) => [

      ...current,

      ...files.map((file) => ({

        id: `${file.name}-${file.lastModified}`,

        name: file.name,

        url: URL.createObjectURL(file),

      })),

    ])



    event.target.value = ""

  }



  const handleSubmit = async () => {

    if (trimmedComment.length < MIN_REVIEW_LENGTH) {

      setValidationError(labels.reviewTextMinLengthWarning)

      return

    }



    setSubmitting(true)

    setValidationError(null)

    setSubmitError(null)



    try {

      await submitParticipationReview(participation.participant_id, {

        rating,

        comment: trimmedComment,

      })



      markParticipationReviewSubmitted(participation.participant_id)

      setSuccess(true)



      window.setTimeout(() => {

        router.push(gbAppRoutes.myParticipations(countryCode))

      }, 1200)

    } catch (err) {

      setSubmitError(

        err instanceof Error ? err.message : labels.reviewError

      )

    } finally {

      setSubmitting(false)

    }

  }



  if (success) {

    return (

      <BbAlert variant="success">

        {labels.reviewSuccessRptb}

      </BbAlert>

    )

  }



  return (

    <div className="flex flex-col gap-4 pb-8">

      <BbCard padding="md">

        <BbCard padding="sm" className="mb-4 border-[#E5E7EB] bg-[#F9FAFB]">

          <Text className="text-sm font-bold text-[#111827]">

            {participation.group_deal.title}

          </Text>

          <Text className="mt-1 text-xs text-[#9CA3AF]">

            {labels.quantity.replace(

              "{count}",

              String(participation.quantity)

            )}

          </Text>

        </BbCard>



        <section className="mb-4 flex flex-col gap-3">

          <BbSectionHeader title={labels.reviewRatingLabel} className="mb-0" />

          <StarRatingInput

            value={rating}

            onChange={setRating}

            ariaLabel={labels.reviewRatingLabel}

          />

        </section>



        <section className="mb-4 flex flex-col gap-2">

          <BbSectionHeader title={labels.reviewCommentLabelRptb} className="mb-0" />

          <textarea

            id="participant-review-comment"

            className="min-h-32 w-full rounded-lg border border-[#E5E7EB] px-3 py-3 text-sm text-[#111827] outline-none focus:border-[#6B46E5]/40 focus:ring-2 focus:ring-[#6B46E5]/20"

            value={comment}

            onChange={(event) => {

              setComment(event.target.value)

              if (validationError && event.target.value.trim().length >= MIN_REVIEW_LENGTH) {

                setValidationError(null)

              }

            }}

            placeholder={labels.reviewCommentPlaceholder}

          />

          <Text className="text-xs text-[#9CA3AF]">

            {labels.reviewTextGuide}

          </Text>

        </section>



        <section className="mb-4 flex flex-col gap-3">

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8">

            <label

              htmlFor="participant-review-photos"

              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-semibold text-[#4B5563] transition-colors hover:border-[#6B46E5]/30 hover:bg-[#F5F3FF]"

            >

              {labels.reviewPhotoAttach}

            </label>

            <Text className="mt-2 text-[10px] text-[#9CA3AF]">

              JPG, PNG (최대 5MB)

            </Text>

          </div>

          <input

            id="participant-review-photos"

            type="file"

            accept="image/*"

            multiple

            className="hidden"

            onChange={handlePhotoChange}

          />



          {photos.length > 0 && (

            <div className="flex flex-wrap gap-3">

              {photos.map((photo) => (

                <div

                  key={photo.id}

                  className="flex w-24 flex-col gap-1"

                >

                  <div className="relative h-24 overflow-hidden rounded-lg border border-[#E5E7EB]">

                    <Image

                      src={photo.url}

                      alt={photo.name}

                      fill

                      unoptimized

                      className="object-cover"

                    />

                  </div>

                  <Text className="truncate text-[10px] text-[#9CA3AF]">

                    {photo.name}

                  </Text>

                </div>

              ))}

            </div>

          )}

        </section>



        {validationError && <BbAlert variant="error">{validationError}</BbAlert>}

        {submitError && <BbAlert variant="error">{submitError}</BbAlert>}



        <BbButton

          variant="cta"

          fullWidth

          isLoading={submitting}

          onClick={() => {

            void handleSubmit()

          }}

        >

          {submitting ? labels.reviewSubmitting : labels.reviewSubmitRptb}

        </BbButton>

      </BbCard>

    </div>

  )

}



export default ParticipantReviewForm

