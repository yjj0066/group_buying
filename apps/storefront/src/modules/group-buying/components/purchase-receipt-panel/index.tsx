"use client"

import { useState } from "react"
import Image from "next/image"

import { useDictionary } from "@i18n/provider"
import { Button, Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type PurchaseReceiptPanelProps = {
  deal: GroupDeal
}

const PurchaseReceiptPanel = ({ deal }: PurchaseReceiptPanelProps) => {
  const t = useDictionary()
  const [open, setOpen] = useState(false)

  const receiptUrl =
    typeof deal.metadata?.purchase_receipt_url === "string"
      ? deal.metadata.purchase_receipt_url
      : typeof deal.purchase_receipt_url === "string"
        ? deal.purchase_receipt_url
        : null

  const isVerified = deal.purchase_receipt_status === "verified"
  const canView = isVerified && receiptUrl

  return (
    <section className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text className="text-sm font-semibold text-ui-fg-base">
            {t.groupBuying.receiptPanelTitle}
          </Text>
          <Text className="mt-1 text-xs text-ui-fg-subtle">
            {canView
              ? t.groupBuying.receiptVerified
              : isVerified
                ? t.groupBuying.receiptPending
                : t.groupBuying.receiptHiddenUntilPurchase}
          </Text>
        </div>
        {canView && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setOpen(true)}
          >
            {t.groupBuying.receiptViewButton}
          </Button>
        )}
      </div>

      {open && receiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4">
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="mb-4"
              onClick={() => setOpen(false)}
            >
              {t.groupBuying.receiptCloseButton}
            </Button>
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={receiptUrl}
                alt={t.groupBuying.receiptPanelTitle}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PurchaseReceiptPanel
