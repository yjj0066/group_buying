"use client"

import { ChangeEvent, useMemo, useState } from "react"

import {
  parseGroupDealReceiptDocument,
  parseGroupDealTrackingDocument,
} from "@lib/data/group-deal-document-ai"
import {
  assertDocumentUploadSize,
  readFileAsDataUrl,
} from "@lib/util/file-to-data-url"
import {
  buildReceiptExtractFields,
  buildReceiptVerificationItems,
  buildShippingExtractFields,
  buildShippingVerificationItems,
  resolveDocumentAiStatusLabel,
} from "@lib/util/group-deal-document-ai-presenter"
import { useDictionary } from "@i18n/provider"
import { formatMessage } from "@i18n/format-message"
import {
  BbBadge,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type {
  AiExtractField,
  GroupDealDocumentParseResponse,
  VerificationItem,
} from "types/group-deal-document-ai"

export type { AiExtractField, VerificationItem }

type AiVerificationPanelProps = {
  groupDealId: string
  mode: "purchase" | "shipping"
  uploadLabel: string
  onComplete?: (result: GroupDealDocumentParseResponse) => void
}

const statusBadge = {
  pass: { variant: "success" as const, label: "통과" },
  fail: { variant: "warning" as const, label: "실패" },
  pending: { variant: "default" as const, label: "대기" },
}

const AiVerificationPanel = ({
  groupDealId,
  mode,
  uploadLabel,
  onComplete,
}: AiVerificationPanelProps) => {
  const t = useDictionary()
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<GroupDealDocumentParseResponse | null>(
    null
  )

  const extractFields = useMemo(() => {
    if (!result) {
      return []
    }

    if (mode === "purchase") {
      return buildReceiptExtractFields(
        t,
        result.document_ai.structured_receipt
      )
    }

    return buildShippingExtractFields(t, result.document_ai.invoice_rows)
  }, [mode, result, t])

  const verificationItems = useMemo(() => {
    if (!result) {
      return []
    }

    if (mode === "purchase") {
      return buildReceiptVerificationItems(
        t,
        result.document_ai.validation,
        true
      )
    }

    return buildShippingVerificationItems(t, result.document_ai)
  }, [mode, result, t])

  const statusLabel = result
    ? resolveDocumentAiStatusLabel(
        t,
        result.document_ai.status,
        result.document_ai.needs_review
      )
    : null

  const confidenceLabel =
    result?.document_ai.confidence != null
      ? formatMessage(t.groupBuying.documentAiConfidence, {
          confidence: Math.round(result.document_ai.confidence * 100),
        })
      : null

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setErrorMessage(null)
    setFileName(file.name)
    setIsUploading(true)
    setResult(null)

    try {
      assertDocumentUploadSize(file)
      const imageBase64 = await readFileAsDataUrl(file)
      const payload = {
        image_base64: imageBase64,
        filename: file.name,
      }

      const response =
        mode === "purchase"
          ? await parseGroupDealReceiptDocument(groupDealId, payload)
          : await parseGroupDealTrackingDocument(groupDealId, payload)

      setResult(response)
      onComplete?.(response)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t.groupBuying.documentAiUploadError
      )
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-purple/5 px-4 py-8 transition-colors hover:border-brand-purple/50">
        <span className="text-2xl">📄</span>
        <Text className="text-sm font-bold text-brand-purple">{uploadLabel}</Text>
        <Text className="text-xs text-[var(--bb-mute)]">
          JPG, PNG, PDF · 최대 8MB
        </Text>
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          disabled={isUploading}
          onChange={handleUpload}
        />
        {fileName && (
          <Text className="text-xs font-medium text-[var(--bb-ink)]">
            {fileName}
          </Text>
        )}
        {isUploading && (
          <Text className="text-xs font-medium text-brand-purple">
            {t.groupBuying.documentAiProcessing}
          </Text>
        )}
      </label>

      {errorMessage && (
        <BbCard padding="md" tone="warning">
          <Text className="text-sm font-medium text-[var(--bb-ink)]">
            {errorMessage}
          </Text>
        </BbCard>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {statusLabel && (
              <BbBadge
                variant={
                  result.document_ai.status === "parsed" &&
                  !result.document_ai.needs_review
                    ? "success"
                    : result.document_ai.status === "failed"
                      ? "warning"
                      : "default"
                }
              >
                {statusLabel}
              </BbBadge>
            )}
            {confidenceLabel && (
              <Text className="text-xs font-medium text-[var(--bb-mute)]">
                {confidenceLabel}
              </Text>
            )}
          </div>

          {extractFields.length > 0 && (
            <section>
              <BbSectionHeader title={t.groupBuying.receiptStructuredTitle} />
              <BbCard padding="md" className="mt-3">
                <BbKeyValue
                  items={extractFields.map((field) => ({
                    label: field.label,
                    value: field.value,
                  }))}
                />
              </BbCard>
            </section>
          )}

          {verificationItems.length > 0 && (
            <section>
              <BbSectionHeader title={t.groupBuying.documentAiVerificationTitle} />
              <div className="mt-3 flex flex-col gap-2">
                {verificationItems.map((item) => (
                  <BbCard
                    key={item.id}
                    padding="md"
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <Text className="text-sm font-bold text-[var(--bb-ink)]">
                        {item.label}
                      </Text>
                      {item.detail && (
                        <Text className="mt-0.5 text-xs text-[var(--bb-mute)]">
                          {item.detail}
                        </Text>
                      )}
                    </div>
                    <BbBadge variant={statusBadge[item.status].variant}>
                      {statusBadge[item.status].label}
                    </BbBadge>
                  </BbCard>
                ))}
              </div>
            </section>
          )}

          {extractFields.some((field) => field.masked) && (
            <section>
              <BbSectionHeader title={t.groupBuying.documentAiMaskingPreview} />
              <BbCard tone="trust" padding="md" className="mt-3">
                <div className="grid gap-2 font-mono text-xs">
                  {extractFields
                    .filter((field) => field.masked)
                    .map((field) => (
                      <p key={field.label} className="text-[var(--bb-mute)]">
                        <span className="font-semibold text-[var(--bb-ink)]">
                          {field.label}:
                        </span>{" "}
                        {field.masked}
                      </p>
                    ))}
                </div>
              </BbCard>
            </section>
          )}

          {mode === "shipping" &&
            (result.document_ai.invoice_rows?.length ?? 0) > 1 && (
              <section>
                <BbSectionHeader title="추출된 송장 행" />
                <div className="mt-3 flex flex-col gap-2">
                  {result.document_ai.invoice_rows?.map((row, index) => (
                    <BbCard key={`${row.tracking_number ?? "row"}-${index}`} padding="md">
                      <BbKeyValue
                        items={[
                          {
                            label: t.groupBuying.documentAiFieldRecipient,
                            value: row.recipient_name ?? "-",
                          },
                          {
                            label: t.groupBuying.documentAiFieldCarrier,
                            value: row.carrier ?? "-",
                          },
                          {
                            label: t.groupBuying.documentAiFieldTrackingNumber,
                            value: row.tracking_number ?? "-",
                          },
                        ]}
                      />
                    </BbCard>
                  ))}
                </div>
              </section>
            )}
        </>
      )}
    </div>
  )
}

export default AiVerificationPanel
