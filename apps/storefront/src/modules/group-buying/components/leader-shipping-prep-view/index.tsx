"use client"

import { ChangeEvent, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { confirmLeaderShipping } from "@lib/data/leader-shipping"
import { SHIPPING_COURIER_OPTIONS } from "@lib/constants/shipping-couriers"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  applyAllocationDraftsToParticipations,
  createInitialTrackingDraft,
  downloadTrackingTemplateCsv,
  mergeTrackingUploadRows,
  parseTrackingUploadCsv,
  toLeaderShippingParticipantRows,
  validateTrackingDraft,
  type LeaderTrackingDraft,
} from "@lib/util/leader-shipping-tracking"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type LeaderShippingPrepViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const LeaderShippingPrepView = ({
  deal,
  participations,
}: LeaderShippingPrepViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderShippingPrep
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const participantRows = useMemo(() => {
    const resolvedParticipations = applyAllocationDraftsToParticipations(
      deal.id,
      participations
    )

    return toLeaderShippingParticipantRows(resolvedParticipations)
  }, [deal.id, participations])

  const [trackingDraft, setTrackingDraft] = useState<LeaderTrackingDraft>(() =>
    createInitialTrackingDraft(participantRows)
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateTrackingEntry = (
    participantId: string,
    patch: Partial<{ courier: string; trackingNumber: string }>
  ) => {
    setTrackingDraft((current) => ({
      ...current,
      [participantId]: {
        courier: patch.courier ?? current[participantId]?.courier ?? "",
        trackingNumber:
          patch.trackingNumber ?? current[participantId]?.trackingNumber ?? "",
      },
    }))
    setValidationError(null)
    setSubmitError(null)
  }

  const handleDownloadTemplate = () => {
    downloadTrackingTemplateCsv(`shipping-template-${deal.id}.csv`, participantRows, {
      nameColumn: labels.csvNameColumn,
      phoneColumn: labels.csvPhoneColumn,
      addressColumn: labels.csvAddressColumn,
      courierColumn: labels.csvCourierColumn,
      trackingColumn: labels.csvTrackingColumn,
    })
  }

  const handleUploadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setUploadError(null)
    setUploadSuccess(null)

    try {
      const content = await file.text()
      const parsedRows = parseTrackingUploadCsv(content)

      if (!parsedRows.length) {
        setUploadError(labels.uploadEmptyError)
        return
      }

      setTrackingDraft((current) =>
        mergeTrackingUploadRows(participantRows, parsedRows, current)
      )
      setUploadSuccess(
        labels.uploadSuccess.replace("{count}", String(parsedRows.length))
      )
    } catch {
      setUploadError(labels.uploadParseError)
    }
  }

  const handleSubmit = async () => {
    setValidationError(null)
    setSubmitError(null)
    setSuccessMessage(null)

    const validation = validateTrackingDraft(participantRows, trackingDraft)

    if (!validation.ok) {
      setValidationError(
        labels.validationError.replace(
          "{count}",
          String(validation.missingParticipantIds.length)
        )
      )
      return
    }

    setIsSubmitting(true)

    const result = await confirmLeaderShipping(
      deal.id,
      participantRows.map((participant) => ({
        participant_id: participant.participantId,
        carrier: trackingDraft[participant.participantId].courier.trim(),
        tracking_number:
          trackingDraft[participant.participantId].trackingNumber.trim(),
      }))
    )

    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    setSuccessMessage(
      labels.successMessage.replace(
        "{count}",
        String(result.notified_count)
      )
    )

    window.setTimeout(() => {
      router.push(gbAppRoutes.sellerSettlement(countryCode, deal.id))
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <LocalizedClientLink href={gbAppRoutes.sellerDeal(countryCode, deal.id)}>
        <BbButton variant="secondary" size="sm">
          {labels.backToDashboard}
        </BbButton>
      </LocalizedClientLink>

      <BbSectionHeader
        title={labels.title}
        subtitle={`${labels.stepLabel} · ${deal.title}`}
      />

      {participantRows.length === 0 ? (
        <BbAlert variant="info">{labels.emptyParticipants}</BbAlert>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <BbSectionHeader title={labels.bulkToolsTitle} className="mb-0" />
            <div className="flex flex-wrap gap-2">
              <BbButton
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
                data-testid="leader-shipping-download-template"
              >
                {labels.downloadTemplate}
              </BbButton>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[var(--bb-line)] bg-white px-3 text-xs font-semibold text-[var(--bb-ink)] transition-colors hover:border-brand-purple/30 hover:bg-brand-purple/5 h-9">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleUploadCsv}
                  data-testid="leader-shipping-upload-csv"
                />
                {labels.uploadCsv}
              </label>
            </div>
            <Text className="text-xs text-[var(--bb-mute)]">
              {labels.uploadHint}
            </Text>
            {uploadError ? (
              <BbAlert variant="error">{uploadError}</BbAlert>
            ) : null}
            {uploadSuccess ? (
              <BbAlert variant="success">{uploadSuccess}</BbAlert>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <BbSectionHeader
              title={labels.participantListTitle}
              className="mb-0"
            />
            <div className="flex flex-col gap-3">
              {participantRows.map((participant) => {
                const entry = trackingDraft[participant.participantId] ?? {
                  courier: "",
                  trackingNumber: "",
                }

                return (
                  <BbCard
                    key={participant.participantId}
                    padding="md"
                    className="flex flex-col gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <Text className="text-sm font-black text-[var(--bb-ink)]">
                        {participant.recipientName}
                      </Text>
                      <Text className="text-xs text-[var(--bb-mute)]">
                        {participant.phone}
                      </Text>
                      <Text className="text-xs text-[var(--bb-ink)]">
                        {participant.address}
                      </Text>
                      {participant.memberLabel ? (
                        <Text className="text-[10px] font-semibold text-brand-purple">
                          {labels.memberLabel.replace(
                            "{member}",
                            participant.memberLabel
                          )}
                        </Text>
                      ) : null}
                    </div>

                    <div className="grid gap-2 small:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor={`courier-${participant.participantId}`}
                          className="text-xs font-semibold text-[var(--bb-mute)]"
                        >
                          {labels.courierLabel}
                        </label>
                        <select
                          id={`courier-${participant.participantId}`}
                          className="bb-input w-full"
                          value={entry.courier}
                          onChange={(event) =>
                            updateTrackingEntry(participant.participantId, {
                              courier: event.target.value,
                            })
                          }
                          data-testid={`leader-shipping-courier-${participant.participantId}`}
                        >
                          <option value="">{labels.courierPlaceholder}</option>
                          {SHIPPING_COURIER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor={`tracking-${participant.participantId}`}
                          className="text-xs font-semibold text-[var(--bb-mute)]"
                        >
                          {labels.trackingLabel}
                        </label>
                        <input
                          id={`tracking-${participant.participantId}`}
                          className="bb-input w-full"
                          placeholder={labels.trackingPlaceholder}
                          value={entry.trackingNumber}
                          onChange={(event) =>
                            updateTrackingEntry(participant.participantId, {
                              trackingNumber: event.target.value,
                            })
                          }
                          data-testid={`leader-shipping-tracking-${participant.participantId}`}
                        />
                      </div>
                    </div>
                  </BbCard>
                )
              })}
            </div>
          </section>
        </>
      )}

      {validationError ? (
        <BbAlert variant="error">{validationError}</BbAlert>
      ) : null}
      {submitError ? <BbAlert variant="error">{submitError}</BbAlert> : null}
      {successMessage ? (
        <BbAlert variant="success">{successMessage}</BbAlert>
      ) : null}

      <BbButton
        variant="cta"
        fullWidth
        disabled={participantRows.length === 0 || isSubmitting}
        onClick={handleSubmit}
        data-testid="leader-shipping-submit"
      >
        {isSubmitting ? labels.submitting : labels.submitButton}
      </BbButton>
    </div>
  )
}

export default LeaderShippingPrepView
