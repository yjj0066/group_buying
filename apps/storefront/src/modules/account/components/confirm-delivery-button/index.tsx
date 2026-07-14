"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { confirmParticipantDelivery } from "@lib/data/account-group-deals"
import { Button, Text } from "@modules/common/components/ui"

type ConfirmDeliveryButtonProps = {
  participantId: string
  labels: {
    confirm: string
    confirming: string
    confirmed: string
    error: string
  }
}

const ConfirmDeliveryButton = ({
  participantId,
  labels,
}: ConfirmDeliveryButtonProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    setError(null)

    startTransition(async () => {
      try {
        await confirmParticipantDelivery(participantId)
        setConfirmed(true)
        router.refresh()
      } catch {
        setError(labels.error)
      }
    })
  }

  if (confirmed) {
    return (
      <Text className="text-sm font-medium text-emerald-700">
        {labels.confirmed}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="small"
        onClick={handleConfirm}
        disabled={isPending}
        isLoading={isPending}
      >
        {isPending ? labels.confirming : labels.confirm}
      </Button>
      {error && <Text className="text-xs text-red-600">{error}</Text>}
    </div>
  )
}

export default ConfirmDeliveryButton
