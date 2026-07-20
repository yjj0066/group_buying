"use client"

import { useRouter } from "next/navigation"

import useToggleState from "@lib/hooks/use-toggle-state"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { BbButton } from "@modules/design-system"
import PurchaseConfirmDialog from "@modules/group-buying/components/purchase-confirm-dialog"
import type { AccountParticipation } from "types/account-group-deals"

type PurchaseConfirmButtonProps = {
  participation: AccountParticipation
  countryCode: string
  className?: string
  fullWidth?: boolean
  labels: {
    button: string
    dialogTitle: string
    dialogMessage: string
    dialogConfirm: string
    dialogCancel: string
  }
}

const PurchaseConfirmButton = ({
  participation,
  countryCode,
  className,
  fullWidth = true,
  labels,
}: PurchaseConfirmButtonProps) => {
  const router = useRouter()
  const { state: open, open: openDialog, close: closeDialog } = useToggleState()

  const handleConfirm = () => {
    closeDialog()
    router.push(
      gbAppRoutes.participationReview(countryCode, participation.participant_id)
    )
  }

  return (
    <>
      <BbButton
        variant="cta"
        fullWidth={fullWidth}
        className={className}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openDialog()
        }}
      >
        {labels.button}
      </BbButton>

      <PurchaseConfirmDialog
        open={open}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        labels={{
          title: labels.dialogTitle,
          message: labels.dialogMessage,
          confirm: labels.dialogConfirm,
          cancel: labels.dialogCancel,
        }}
      />
    </>
  )
}

export default PurchaseConfirmButton
