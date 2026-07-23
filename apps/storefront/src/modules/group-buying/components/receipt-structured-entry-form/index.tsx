"use client"

import { FormEvent, useMemo, useState } from "react"

import { confirmGroupDealReceiptStructured } from "@lib/data/group-deal-document-ai"
import {
  buildReceiptStructuredDraft,
  type ReceiptStructuredDraft,
} from "@lib/util/group-deal-document-ai-presenter"
import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import { BbAlert, BbButton, BbSectionHeader } from "@modules/design-system"
import type {
  GroupDealDocumentParseResponse,
  StructuredReceiptFields,
} from "types/group-deal-document-ai"

type ReceiptStructuredEntryFormProps = {
  groupDealId: string
  initialStructured?: StructuredReceiptFields | null
  onSuccess: (result: GroupDealDocumentParseResponse) => void
  onCancel?: () => void
  showCancel?: boolean
}

const parsePositiveInt = (value: string): number | null => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const numeric = Number(trimmed)

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null
  }

  return numeric
}

const parsePositiveNumber = (value: string): number | null => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const numeric = Number(trimmed)

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }

  return numeric
}

const ReceiptStructuredEntryForm = ({
  groupDealId,
  initialStructured,
  onSuccess,
  onCancel,
  showCancel = false,
}: ReceiptStructuredEntryFormProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchase
  const [draft, setDraft] = useState<ReceiptStructuredDraft>(() =>
    buildReceiptStructuredDraft(initialStructured)
  )
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fieldLabels = useMemo(
    () => ({
      seller: t.groupBuying.receiptFieldSeller,
      orderNumber: t.groupBuying.receiptFieldOrderNumber,
      orderedAt: t.groupBuying.receiptFieldOrderedAt,
      albumQuantity: t.groupBuying.receiptFieldAlbumQuantity,
      totalAmount: t.groupBuying.receiptFieldTotalAmount,
    }),
    [t.groupBuying]
  )

  const updateDraft = (patch: Partial<ReceiptStructuredDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setClientError(null)
    setServerError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setClientError(null)
    setServerError(null)
    setSuccessMessage(null)

    const orderNumber = draft.order_number.trim()
    const albumQuantity = parsePositiveInt(draft.album_quantity)

    if (!orderNumber) {
      setClientError(labels.manualEntryRequiredError)
      return
    }

    if (albumQuantity == null) {
      setClientError(labels.manualAlbumQuantityError)
      return
    }

    const totalAmount = draft.total_amount.trim()
      ? parsePositiveNumber(draft.total_amount)
      : null

    if (draft.total_amount.trim() && totalAmount == null) {
      setClientError(labels.manualTotalAmountError)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await confirmGroupDealReceiptStructured(groupDealId, {
        order_number: orderNumber,
        seller: draft.seller.trim() ? draft.seller.trim() : null,
        ordered_at: draft.ordered_at.trim() ? draft.ordered_at.trim() : null,
        album_quantity: albumQuantity,
        total_amount: totalAmount,
      })

      if (!result.ok) {
        setServerError(result.error)
        return
      }

      setSuccessMessage(labels.manualEntrySuccess)
      onSuccess(result.data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <BbSectionHeader title={labels.manualEntryTitle} />
      <Text className="text-xs text-[var(--bb-mute)]">{labels.manualEntryHint}</Text>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <Text className="text-xs font-bold text-[var(--bb-ink)]">
            {fieldLabels.seller}
          </Text>
          <input
            className="bb-input w-full"
            value={draft.seller}
            placeholder={labels.manualSellerPlaceholder}
            onChange={(event) => updateDraft({ seller: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <Text className="text-xs font-bold text-[var(--bb-ink)]">
            {fieldLabels.orderNumber}
            <span className="text-brand-purple"> *</span>
          </Text>
          <input
            className="bb-input w-full"
            value={draft.order_number}
            placeholder={labels.manualOrderNumberPlaceholder}
            onChange={(event) =>
              updateDraft({ order_number: event.target.value })
            }
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <Text className="text-xs font-bold text-[var(--bb-ink)]">
            {fieldLabels.orderedAt}
          </Text>
          <input
            className="bb-input w-full"
            type="datetime-local"
            value={
              draft.ordered_at.includes("T")
                ? draft.ordered_at.slice(0, 16)
                : draft.ordered_at
            }
            onChange={(event) =>
              updateDraft({
                ordered_at: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : "",
              })
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <Text className="text-xs font-bold text-[var(--bb-ink)]">
            {fieldLabels.albumQuantity}
            <span className="text-brand-purple"> *</span>
          </Text>
          <input
            className="bb-input w-full"
            inputMode="numeric"
            value={draft.album_quantity}
            placeholder={labels.manualAlbumQuantityPlaceholder}
            onChange={(event) =>
              updateDraft({ album_quantity: event.target.value })
            }
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <Text className="text-xs font-bold text-[var(--bb-ink)]">
            {fieldLabels.totalAmount}
          </Text>
          <input
            className="bb-input w-full"
            inputMode="numeric"
            value={draft.total_amount}
            placeholder={labels.manualTotalAmountPlaceholder}
            onChange={(event) =>
              updateDraft({ total_amount: event.target.value })
            }
          />
        </label>

        {clientError ? (
          <BbAlert variant="error">{clientError}</BbAlert>
        ) : null}
        {serverError ? (
          <BbAlert variant="error" className="whitespace-pre-wrap">
            {serverError}
          </BbAlert>
        ) : null}
        {successMessage ? (
          <BbAlert variant="success">{successMessage}</BbAlert>
        ) : null}

        <div className="flex flex-col gap-2 small:flex-row">
          {showCancel && onCancel ? (
            <BbButton
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={onCancel}
            >
              {labels.cancelEditButton}
            </BbButton>
          ) : null}
          <BbButton
            type="submit"
            variant="cta"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting
              ? labels.manualEntrySubmitting
              : labels.saveManualEntryButton}
          </BbButton>
        </div>
      </form>
    </section>
  )
}

export default ReceiptStructuredEntryForm
