"use client"

import Image from "next/image"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  assertDocumentUploadSize,
  readFileAsDataUrl,
} from "@lib/util/file-to-data-url"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

import { computeLeaderTargetOrderQuantity } from "./compute-target-quantity"
import {
  loadLeaderPurchaseProofDraft,
  saveLeaderPurchaseProofDraft,
  type LeaderPurchaseProofDraft,
} from "./storage"

type LeaderPurchaseProofFormProps = {
  deal: GroupDeal
}

const parsePositiveNumber = (value: string): number | null => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed.replace(/,/g, ""))

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

const LeaderPurchaseProofForm = ({ deal }: LeaderPurchaseProofFormProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchaseProof
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const targetQuantity = useMemo(
    () => computeLeaderTargetOrderQuantity(deal),
    [deal]
  )

  const [receiptFileName, setReceiptFileName] = useState<string | null>(null)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null)
  const [purchasedQuantityInput, setPurchasedQuantityInput] = useState("")
  const [totalPaidAmountInput, setTotalPaidAmountInput] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const draft = loadLeaderPurchaseProofDraft(deal.id, targetQuantity)

    setReceiptFileName(draft.receiptFileName)
    setReceiptPreviewUrl(draft.receiptPreviewUrl)
    setReceiptDataUrl(draft.receiptDataUrl)
    setPurchasedQuantityInput(
      draft.purchasedQuantity != null ? String(draft.purchasedQuantity) : ""
    )
    setTotalPaidAmountInput(
      draft.totalPaidAmount != null ? String(draft.totalPaidAmount) : ""
    )
  }, [deal.id, targetQuantity])

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreviewUrl)
      }
    }
  }, [receiptPreviewUrl])

  const handleReceiptChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      assertDocumentUploadSize(file)
      const dataUrl = await readFileAsDataUrl(file)

      if (receiptPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreviewUrl)
      }

      const previewUrl = URL.createObjectURL(file)

      setReceiptFileName(file.name)
      setReceiptPreviewUrl(previewUrl)
      setReceiptDataUrl(dataUrl)

      const draft: LeaderPurchaseProofDraft = {
        ...loadLeaderPurchaseProofDraft(deal.id, targetQuantity),
        receiptFileName: file.name,
        receiptPreviewUrl: previewUrl,
        receiptDataUrl: dataUrl,
      }

      saveLeaderPurchaseProofDraft(deal.id, draft)
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : labels.uploadError
      )
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const handleSubmit = () => {
    const purchasedQuantity = parsePositiveNumber(purchasedQuantityInput)
    const totalPaidAmount = parsePositiveNumber(totalPaidAmountInput)

    if (!receiptDataUrl || !receiptFileName) {
      setValidationError(labels.receiptRequiredError)
      return
    }

    if (purchasedQuantity == null) {
      setValidationError(labels.purchasedQuantityError)
      return
    }

    if (totalPaidAmount == null) {
      setValidationError(labels.totalPaidAmountError)
      return
    }

    setValidationError(null)

    const draft: LeaderPurchaseProofDraft = {
      receiptFileName,
      receiptPreviewUrl,
      receiptDataUrl,
      purchasedQuantity,
      totalPaidAmount,
      targetQuantity,
      submittedAt: new Date().toISOString(),
    }

    saveLeaderPurchaseProofDraft(deal.id, draft)

    const params = new URLSearchParams({
      purchasedQty: String(purchasedQuantity),
      targetQty: String(targetQuantity),
    })

    router.push(
      `${gbAppRoutes.sellerQuantityVerification(countryCode, deal.id)}?${params.toString()}`
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BbKeyValue
        items={[
          {
            label: labels.targetQuantityLabel,
            value: labels.quantityUnit.replace(
              "{count}",
              String(targetQuantity)
            ),
          },
        ]}
      />

      <section className="flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-purple/5 px-4 py-8 transition-colors hover:border-brand-purple/50">
          <Text className="text-sm font-bold text-brand-purple">
            {labels.uploadButton}
          </Text>
          <Text className="text-xs text-[var(--bb-mute)]">
            {labels.uploadHint}
          </Text>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={isUploading}
            onChange={handleReceiptChange}
            data-testid="leader-purchase-proof-receipt-input"
          />
          {receiptFileName && (
            <Text className="text-xs font-medium text-[var(--bb-ink)]">
              {receiptFileName}
            </Text>
          )}
          {isUploading && (
            <Text className="text-xs font-medium text-brand-purple">
              {labels.uploading}
            </Text>
          )}
        </label>

        {uploadError && <BbAlert variant="warn">{uploadError}</BbAlert>}

        {receiptPreviewUrl && (
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-surface)]">
            <Image
              src={receiptPreviewUrl}
              alt={labels.previewAlt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="purchased-quantity"
            className="text-sm font-semibold text-[var(--bb-ink)]"
          >
            {labels.purchasedQuantityLabel}
          </label>
          <input
            id="purchased-quantity"
            type="number"
            min={1}
            inputMode="numeric"
            className="bb-input"
            placeholder={labels.purchasedQuantityPlaceholder}
            value={purchasedQuantityInput}
            onChange={(event) => setPurchasedQuantityInput(event.target.value)}
            data-testid="leader-purchase-proof-quantity-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="total-paid-amount"
            className="text-sm font-semibold text-[var(--bb-ink)]"
          >
            {labels.totalPaidAmountLabel}
          </label>
          <input
            id="total-paid-amount"
            type="number"
            min={1}
            inputMode="numeric"
            className="bb-input"
            placeholder={labels.totalPaidAmountPlaceholder}
            value={totalPaidAmountInput}
            onChange={(event) => setTotalPaidAmountInput(event.target.value)}
            data-testid="leader-purchase-proof-amount-input"
          />
        </div>
      </section>

      {validationError && <BbAlert variant="warn">{validationError}</BbAlert>}

      <BbButton
        variant="cta"
        fullWidth
        onClick={handleSubmit}
        data-testid="leader-purchase-proof-submit"
      >
        {labels.submitButton}
      </BbButton>
    </div>
  )
}

export default LeaderPurchaseProofForm
