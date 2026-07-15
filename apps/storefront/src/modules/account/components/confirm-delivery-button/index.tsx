"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { confirmParticipantDelivery } from "@lib/data/account-group-deals"
import { Button } from "@modules/common/components/ui"

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
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  )

  const handleConfirm = async () => {
    if (
      !window.confirm(
        "수령 확인 후에는 되돌릴 수 없습니다. 문제가 있으면 분쟁 신고를 이용해 주세요."
      )
    ) {
      return
    }

    setStatus("loading")

    try {
      await confirmParticipantDelivery(participantId)
      setStatus("done")
      router.refresh()
    } catch {
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <Button size="small" variant="secondary" disabled>
        {labels.confirmed}
      </Button>
    )
  }

  return (
    <Button
      size="small"
      onClick={handleConfirm}
      disabled={status === "loading"}
      isLoading={status === "loading"}
    >
      {status === "loading" ? labels.confirming : labels.confirm}
    </Button>
  )
}

export default ConfirmDeliveryButton
