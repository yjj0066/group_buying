"use client"

import { useMemo } from "react"

import { useDictionary } from "@i18n/provider"
import { formatMessage } from "@i18n/format-message"
import {
  buildReceiptExtractFields,
  buildReceiptVerificationItems,
  buildShippingVerificationItems,
  resolveVerificationStatusLabel,
  resolveVerificationStatusVariant,
} from "@lib/util/group-deal-document-ai-presenter"
import {
  formatConfidence,
  getReportStageIndex,
  readStructuredReceipt,
  REPORT_STAGES,
  resolveDisputeStatusLabel,
  resolveDocumentAiStatusLabel,
  resolveReportStageLabel,
} from "@lib/util/group-deal-report-presenter"
import {
  BbBadge,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { AccountGroupDeal } from "types/account-group-deals"
import type { StructuredInvoiceRow } from "types/group-deal-document-ai"

type GroupDealAiReportPanelProps = {
  deal: AccountGroupDeal
  audience?: "leader" | "participant"
}

const GroupDealAiReportPanel = ({
  deal,
  audience = "leader",
}: GroupDealAiReportPanelProps) => {
  const t = useDictionary()
  const labels =
    audience === "leader"
      ? t.account.hostedDeals.report
      : t.account.participations.report

  const reportStageLabels = labels.reportStageLabels
  const disputeStatusLabels = labels.disputeStatusLabels
  const currentStageIndex = getReportStageIndex(deal.report_stage ?? "not_started")
  const structuredReceipt = readStructuredReceipt(deal)

  const receiptFields = useMemo(
    () => buildReceiptExtractFields(t, structuredReceipt),
    [structuredReceipt, t]
  )

  const receiptVerificationItems = useMemo(
    () =>
      buildReceiptVerificationItems(
        t,
        deal.receipt_ai_validation ?? undefined,
        structuredReceipt,
        Boolean(structuredReceipt)
      ),
    [deal.receipt_ai_validation, structuredReceipt, t]
  )

  const invoiceRows = useMemo(() => {
    return (deal.tracking_ai_invoice_rows ?? [])
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null
        }

        const record = row as Record<string, unknown>

        return {
          recipient_name:
            typeof record.recipient_name === "string"
              ? record.recipient_name
              : null,
          carrier:
            typeof record.carrier === "string" ? record.carrier : null,
          tracking_number:
            typeof record.tracking_number === "string"
              ? record.tracking_number
              : null,
          address_hint:
            typeof record.address_hint === "string"
              ? record.address_hint
              : null,
          confidence:
            record.confidence != null ? Number(record.confidence) : 0,
          needs_review: Boolean(record.needs_review),
        } satisfies StructuredInvoiceRow
      })
      .filter((row): row is StructuredInvoiceRow => row != null)
  }, [deal.tracking_ai_invoice_rows])

  const shippingVerificationItems = useMemo(
    () =>
      buildShippingVerificationItems(t, {
        job_id: null,
        status: (deal.tracking_ai_status ??
          "not_requested") as "not_requested",
        confidence: deal.tracking_ai_confidence ?? null,
        needs_review: deal.tracking_ai_status === "needs_review",
        invoice_rows: invoiceRows,
        auto_matched_participant_ids: Array.from(
          { length: deal.tracking_ai_matched_count ?? 0 },
          (_, index) => `matched-${index}`
        ),
        review_conflicts: Array.from(
          { length: deal.tracking_ai_conflict_count ?? 0 },
          (_, index) => ({ id: index })
        ),
      }),
    [deal, invoiceRows, t]
  )

  return (
    <div className="flex flex-col gap-5">
      <section>
        <BbSectionHeader title={labels.reportStageTitle} />
        <BbCard padding="md" className="mt-3">
          <div className="grid gap-2">
            {REPORT_STAGES.map((stage, index) => {
              const isActive = index <= currentStageIndex
              const isCurrent = stage === deal.report_stage

              return (
                <div
                  key={stage}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                    isCurrent
                      ? "border-brand-purple/40 bg-brand-purple/5"
                      : isActive
                        ? "border-[var(--bb-line)] bg-[var(--bb-surface)]"
                        : "border-[var(--bb-line)] opacity-60"
                  }`}
                >
                  <Text className="text-sm font-medium text-[var(--bb-ink)]">
                    {resolveReportStageLabel(reportStageLabels, stage)}
                  </Text>
                  {isCurrent && (
                    <BbBadge variant="default">{labels.currentStageBadge}</BbBadge>
                  )}
                </div>
              )
            })}
          </div>
        </BbCard>
      </section>

      <section>
        <BbSectionHeader title={labels.receiptAiTitle} />
        <BbCard padding="md" className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <BbBadge
              variant={
                deal.receipt_ai_status === "parsed"
                  ? "success"
                  : deal.receipt_ai_status === "failed"
                    ? "warning"
                    : "default"
              }
            >
              {resolveDocumentAiStatusLabel(t, deal.receipt_ai_status)}
            </BbBadge>
            {formatConfidence(deal.receipt_ai_confidence) && (
              <Text className="text-xs text-[var(--bb-mute)]">
                {formatMessage(t.groupBuying.documentAiConfidence, {
                  confidence: Math.round((deal.receipt_ai_confidence ?? 0) * 100),
                })}
              </Text>
            )}
            <Text className="text-xs text-[var(--bb-mute)]">
              {labels.receiptStatusLabel}: {deal.purchase_receipt_status}
            </Text>
          </div>

          {receiptFields.length > 0 ? (
            <div className="mt-4">
              <BbKeyValue
                items={receiptFields.map((field) => ({
                  label: field.label,
                  value: field.value,
                }))}
              />
            </div>
          ) : (
            <Text className="mt-4 text-sm text-[var(--bb-mute)]">
              {labels.receiptEmpty}
            </Text>
          )}

          {receiptVerificationItems.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {receiptVerificationItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--bb-line)] px-3 py-2"
                >
                  <div>
                    <Text className="text-sm font-semibold text-[var(--bb-ink)]">
                      {item.label}
                    </Text>
                    {item.detail && (
                      <Text className="mt-0.5 text-xs text-[var(--bb-mute)]">
                        {item.detail}
                      </Text>
                    )}
                  </div>
                  <BbBadge variant={resolveVerificationStatusVariant(item.status)}>
                    {resolveVerificationStatusLabel(t, item.status)}
                  </BbBadge>
                </div>
              ))}
            </div>
          )}
        </BbCard>
      </section>

      <section>
        <BbSectionHeader title={labels.trackingAiTitle} />
        <BbCard padding="md" className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <BbBadge
              variant={
                deal.tracking_ai_status === "parsed"
                  ? "success"
                  : deal.tracking_ai_status === "failed"
                    ? "warning"
                    : "default"
              }
            >
              {resolveDocumentAiStatusLabel(t, deal.tracking_ai_status)}
            </BbBadge>
            {formatConfidence(deal.tracking_ai_confidence) && (
              <Text className="text-xs text-[var(--bb-mute)]">
                {formatMessage(t.groupBuying.documentAiConfidence, {
                  confidence: Math.round((deal.tracking_ai_confidence ?? 0) * 100),
                })}
              </Text>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Text className="text-sm text-[var(--bb-ink)]">
              {labels.trackingMatchedLabel}: {deal.tracking_ai_matched_count ?? 0}
            </Text>
            <Text className="text-sm text-[var(--bb-ink)]">
              {labels.trackingConflictLabel}: {deal.tracking_ai_conflict_count ?? 0}
            </Text>
          </div>

          {invoiceRows.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {invoiceRows.map((row, index) => (
                <BbCard
                  key={`${row.tracking_number ?? "row"}-${index}`}
                  padding="md"
                  className="border border-[var(--bb-line)]"
                >
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
          ) : (
            <Text className="mt-4 text-sm text-[var(--bb-mute)]">
              {labels.trackingEmpty}
            </Text>
          )}

          {shippingVerificationItems.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {shippingVerificationItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--bb-line)] px-3 py-2"
                >
                  <div>
                    <Text className="text-sm font-semibold text-[var(--bb-ink)]">
                      {item.label}
                    </Text>
                    {item.detail && (
                      <Text className="mt-0.5 text-xs text-[var(--bb-mute)]">
                        {item.detail}
                      </Text>
                    )}
                  </div>
                  <BbBadge variant={resolveVerificationStatusVariant(item.status)}>
                    {resolveVerificationStatusLabel(t, item.status)}
                  </BbBadge>
                </div>
              ))}
            </div>
          )}
        </BbCard>
      </section>

      <section>
        <BbSectionHeader title={labels.disputeTitle} />
        <BbCard padding="md" className="mt-3">
          <Text className="text-sm font-medium text-[var(--bb-ink)]">
            {resolveDisputeStatusLabel(
              disputeStatusLabels,
              deal.dispute_status
            )}
          </Text>
          <Text className="mt-2 text-sm text-[var(--bb-mute)]">
            {labels.disputeDescription}
          </Text>
        </BbCard>
      </section>
    </div>
  )
}

export default GroupDealAiReportPanel
