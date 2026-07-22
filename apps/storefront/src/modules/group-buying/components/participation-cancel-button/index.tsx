"use client"

import { useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"

import { cancelMyParticipation } from "@lib/data/account-group-deals-actions"
import useToggleState from "@lib/hooks/use-toggle-state"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { BbButton } from "@modules/design-system"
import PurchaseConfirmDialog from "@modules/group-buying/components/purchase-confirm-dialog"
import { Text } from "@modules/common/components/ui"
import type { AccountParticipation } from "types/account-group-deals"

type ParticipationCancelButtonProps = {
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
    errorMessage?: string
  }
}

const ParticipationCancelButton = ({
  participation,
  countryCode,
  className,
  fullWidth = true,
  labels,
}: ParticipationCancelButtonProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const { state: open, open: openDialog, close: closeDialog } = useToggleState()
  const [isCancelling, setIsCancelling] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsCancelling(true)
    setErrorMessage(null)

    try {
      await cancelMyParticipation(participation.participant_id)
      closeDialog()
      const listPath = pathname.includes("/my/participations")
        ? gbAppRoutes.myParticipations(countryCode)
        : gbAppRoutes.participations(countryCode)

      router.push(`${listPath}?tab=cancelled&cancelled=1`)
      router.refresh()
    } catch {
      setIsCancelling(false)
      setErrorMessage(labels.errorMessage ?? "Could not cancel purchase.")
    }
  }

  return (
    <>
      {errorMessage && (
        <Text className="mb-2 text-sm text-rose-600">{errorMessage}</Text>
      )}
      <BbButton
        variant="danger"
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
        onConfirm={() => {
          void handleConfirm()
        }}
        isConfirming={isCancelling}
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

export default ParticipationCancelButton
