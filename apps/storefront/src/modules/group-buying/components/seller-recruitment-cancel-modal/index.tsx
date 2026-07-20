"use client"

import { useDictionary } from "@i18n/provider"
import { BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

type SellerRecruitmentCancelModalProps = {
  open: boolean
  isSubmitting: boolean
  onConfirm: () => void
  onDismiss: () => void
}

const SellerRecruitmentCancelModal = ({
  open,
  isSubmitting,
  onConfirm,
  onDismiss,
}: SellerRecruitmentCancelModalProps) => {
  const t = useDictionary()
  const labels = t.account.hostedDeals.recruitment

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="recruitment-cancel-title"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl">
        <Text
          id="recruitment-cancel-title"
          className="text-base font-black text-[var(--bb-ink)]"
        >
          {labels.cancelModalTitle}
        </Text>
        <Text className="text-sm leading-relaxed text-[var(--bb-mute)]">
          {labels.cancelModalMessage}
        </Text>
        <div className="flex gap-2 pt-1">
          <BbButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={onDismiss}
            disabled={isSubmitting}
          >
            {labels.cancelModalDismiss}
          </BbButton>
          <BbButton
            type="button"
            variant="danger"
            fullWidth
            isLoading={isSubmitting}
            onClick={onConfirm}
            data-testid="recruitment-cancel-confirm"
          >
            {labels.cancelModalConfirm}
          </BbButton>
        </div>
      </div>
    </div>
  )
}

export default SellerRecruitmentCancelModal
