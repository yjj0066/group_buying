"use client"

import { ChangeEvent, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { parseGroupDealTrackingDocument } from "@lib/data/group-deal-document-ai"
import { confirmLeaderShipping } from "@lib/data/leader-shipping"
import { SHIPPING_COURIER_OPTIONS } from "@lib/constants/shipping-couriers"
import {
  assertDocumentUploadSize,
  readFileAsDataUrl,
} from "@lib/util/file-to-data-url"
import {
  applyManualTrackingPatch,
  buildParticipantManualRows,
  buildShippingMatchSummary,
  findDuplicateParticipantProfileGroups,
  formatMatchReviewReasons,
  getMatchTableDisplayRows,
  matchStatusLabel,
  mergeInvoiceRowsIntoMatchTable,
  mergeParticipantMatchRows,
  compactMatchRowsForState,
  type ShippingMatchReviewReasonLabels,
  type ShippingMatchTableRow,
} from "@lib/util/leader-tracking-match"
import {
  applyAllocationDraftsToParticipations,
  toLeaderShippingParticipantRows,
} from "@lib/util/leader-shipping-tracking"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import { Text } from "@modules/common/components/ui"
import {
  BbAlert,
  BbBadge,
  BbButton,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"
import type { StructuredInvoiceRow } from "types/group-deal-document-ai"

type LeaderShippingPrepViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const statusBadgeVariant = {
  complete: "success" as const,
  needs_review: "warning" as const,
  unmatched: "default" as const,
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

  const [matchRows, setMatchRows] = useState<ShippingMatchTableRow[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const manualRows = useMemo(
    () => buildParticipantManualRows(participantRows, matchRows),
    [matchRows, participantRows]
  )

  const displayRows = useMemo(
    () => getMatchTableDisplayRows(manualRows),
    [manualRows]
  )

  const summary = useMemo(
    () => buildShippingMatchSummary(displayRows),
    [displayRows]
  )

  const duplicateProfileGroups = useMemo(
    () => findDuplicateParticipantProfileGroups(participantRows),
    [participantRows]
  )

  const reviewReasonLabels = useMemo<ShippingMatchReviewReasonLabels>(
    () => ({
      tracking_missing: labels.matchReviewReasons.trackingMissing,
      carrier_missing: labels.matchReviewReasons.carrierMissing,
      low_confidence: labels.matchReviewReasons.lowConfidence,
      ai_needs_review: labels.matchReviewReasons.aiNeedsReview,
      ambiguous_participant: labels.matchReviewReasons.ambiguousParticipant,
      duplicate_recipient_in_upload:
        labels.matchReviewReasons.duplicateRecipientInUpload,
      no_participant_match: labels.matchReviewReasons.noParticipantMatch,
      not_matched_from_upload: labels.matchReviewReasons.notMatchedFromUpload,
      manual_incomplete: labels.matchReviewReasons.manualIncomplete,
      duplicate_participant_profile:
        labels.matchReviewReasons.duplicateParticipantProfile,
    }),
    [labels.matchReviewReasons]
  )

  const handleInvoiceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (!files.length) {
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    setIsUploading(true)

    let mergedRows = [...matchRows]
    let extractedCount = 0

    try {
      for (const file of files) {
        assertDocumentUploadSize(file)
        const imageBase64 = await readFileAsDataUrl(file)

        const result = await parseGroupDealTrackingDocument(deal.id, {
          image_base64: imageBase64,
          filename: file.name,
        })

        if (!result.ok) {
          setUploadError(result.error)
          return
        }

        const invoiceRows = result.data.document_ai.invoice_rows ?? []
        extractedCount += invoiceRows.length

        mergedRows = mergeInvoiceRowsIntoMatchTable(
          participantRows,
          invoiceRows as StructuredInvoiceRow[],
          mergedRows
        )
      }

      setMatchRows(compactMatchRowsForState(mergedRows))
      setUploadSuccess(
        labels.uploadSuccess.replace("{count}", String(extractedCount))
      )
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : labels.uploadParseError
      )
    } finally {
      setIsUploading(false)
    }
  }

  const updateManualTracking = (
    participantId: string,
    patch: { trackingNumber?: string; carrier?: string }
  ) => {
    setMatchRows((current) => {
      const merged = mergeParticipantMatchRows(participantRows, current)

      return compactMatchRowsForState(
        applyManualTrackingPatch(
          merged,
          participantId,
          patch,
          participantRows
        )
      )
    })
    setSubmitError(null)
  }

  const handleConfirmShipping = async () => {
    setSubmitError(null)

    if (!participantRows.length) {
      setSubmitError(labels.emptyParticipants)
      return
    }

    const rowsForSubmit = buildParticipantManualRows(
      participantRows,
      matchRows.filter((row) => row.participantId)
    )

    const incomplete = rowsForSubmit.filter(
      (row) =>
        row.participantId &&
        (!row.trackingNumber.trim() || !row.carrier.trim())
    )

    if (incomplete.length) {
      setSubmitError(
        labels.validationError.replace("{count}", String(incomplete.length))
      )
      return
    }

    setIsSubmitting(true)

    const entries = rowsForSubmit
      .filter((row) => row.participantId)
      .map((row) => ({
        participant_id: row.participantId as string,
        carrier: row.carrier.trim(),
        tracking_number: row.trackingNumber.trim(),
      }))

    const result = await confirmLeaderShipping(deal.id, entries)

    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    router.push(gbAppRoutes.sellerSettlement(countryCode, deal.id))
  }

  const tableRows = displayRows.map((row) => [
    row.recipientLabel,
    row.trackingNumber || "-",
    matchStatusLabel(row.status, {
      complete: labels.matchStatusComplete,
      needsReview: labels.matchStatusNeedsReview,
      unmatched: labels.matchStatusUnmatched,
    }),
    row.status === "complete"
      ? "-"
      : formatMatchReviewReasons(row.reviewReasons, reviewReasonLabels) || "-",
  ])

  return (
    <LeaderWireframeShell screenId="SHIP" title={labels.wireframeTitle}>
      <div className="flex flex-col gap-6">
        <BbSectionHeader
          title={labels.uploadSectionTitle}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-10 text-center transition-colors hover:border-[#6B46E5]/40 hover:bg-[#F5F3FF]">
          <span className="text-2xl">⬆</span>
          <Text className="text-sm font-bold text-[#111827]">
            {labels.uploadCaptureTitle}
          </Text>
          <Text className="text-xs text-[#6B7280] whitespace-pre-line">
            {labels.uploadCaptureHint}
          </Text>
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            disabled={isUploading || participantRows.length === 0}
            onChange={handleInvoiceUpload}
            data-testid="leader-shipping-invoice-upload"
          />
          {isUploading ? (
            <Text className="text-xs font-medium text-[#6B46E5]">
              {labels.uploadProcessing}
            </Text>
          ) : null}
        </label>

        {uploadError ? (
          <BbAlert variant="error" className="whitespace-pre-wrap">
            {uploadError}
          </BbAlert>
        ) : null}
        {uploadSuccess ? (
          <BbAlert variant="success">{uploadSuccess}</BbAlert>
        ) : null}

        {participantRows.length === 0 ? (
          <BbAlert variant="info">{labels.emptyParticipants}</BbAlert>
        ) : (
          <>
            <div>
              <BbSectionHeader
                title={labels.matchResultsTitle}
                className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
              />
              {displayRows.length ? (
                <>
                  <BbTable
                    columns={[
                      labels.matchRecipientColumn,
                      labels.matchTrackingColumn,
                      labels.matchStatusColumn,
                      labels.matchReasonColumn,
                    ]}
                    rows={tableRows}
                  />
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#111827]">
                    <div className="flex items-center justify-between">
                      <span>{labels.summaryCompleteLabel}</span>
                      <span className="font-bold">
                        {labels.summaryCount.replace(
                          "{count}",
                          String(summary.complete)
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{labels.summaryNeedsReviewLabel}</span>
                      <span className="font-bold text-[#D97706]">
                        {labels.summaryCount.replace(
                          "{count}",
                          String(summary.needsReview)
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{labels.summaryUnmatchedLabel}</span>
                      <span className="font-bold text-[#6B7280]">
                        {labels.summaryCount.replace(
                          "{count}",
                          String(summary.unmatched)
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-sm text-[#6B7280]">
                  {labels.matchResultsEmpty}
                </div>
              )}
            </div>

            <div>
              <BbSectionHeader
                title={labels.manualEntryTitle}
                className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
              />
              <Text className="mb-3 text-xs text-[#6B7280]">
                {labels.manualEntryHint}
              </Text>
              {duplicateProfileGroups.length > 0 ? (
                <BbAlert variant="info" className="mb-3 whitespace-pre-wrap">
                  {labels.duplicateProfileHint}
                </BbAlert>
              ) : null}
              <div className="flex flex-col gap-3">
                {participantRows.map((participant) => {
                  const row =
                    manualRows.find(
                      (item) => item.participantId === participant.participantId
                    ) ??
                    ({
                      trackingNumber: "",
                      carrier: "",
                      status: "needs_review",
                      reviewReasons: ["not_matched_from_upload"],
                    } as ShippingMatchTableRow)

                  return (
                    <div
                      key={participant.participantId}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Text className="text-sm font-bold text-[#111827]">
                          {participant.recipientName}
                        </Text>
                        <BbBadge variant={statusBadgeVariant[row.status]}>
                          {matchStatusLabel(row.status, {
                            complete: labels.matchStatusComplete,
                            needsReview: labels.matchStatusNeedsReview,
                            unmatched: labels.matchStatusUnmatched,
                          })}
                        </BbBadge>
                      </div>
                      {row.status !== "complete" &&
                      row.reviewReasons.length > 0 ? (
                        <Text className="mb-2 text-xs text-[#D97706] whitespace-pre-wrap">
                          {formatMatchReviewReasons(
                            row.reviewReasons,
                            reviewReasonLabels
                          )}
                        </Text>
                      ) : null}
                      <div className="grid gap-2 small:grid-cols-2">
                        <select
                          className="bb-input w-full"
                          value={row.carrier}
                          onChange={(event) =>
                            updateManualTracking(participant.participantId, {
                              carrier: event.target.value,
                            })
                          }
                        >
                          <option value="">{labels.courierPlaceholder}</option>
                          {SHIPPING_COURIER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="bb-input w-full"
                          placeholder={labels.manualTrackingPlaceholder}
                          value={row.trackingNumber}
                          onChange={(event) =>
                            updateManualTracking(participant.participantId, {
                              trackingNumber: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {submitError ? (
          <BbAlert variant="error" className="whitespace-pre-wrap">
            {submitError}
          </BbAlert>
        ) : null}

        <BbButton
          variant="cta"
          fullWidth
          disabled={
            participantRows.length === 0 || isSubmitting || isUploading
          }
          onClick={handleConfirmShipping}
          data-testid="leader-shipping-submit"
        >
          {isSubmitting ? labels.submitting : labels.confirmShippingButton}
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default LeaderShippingPrepView
