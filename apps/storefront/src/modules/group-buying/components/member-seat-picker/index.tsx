"use client"

import { useEffect, useMemo, useState } from "react"

import { useDictionary } from "@i18n/provider"
import { BbMemberSeatCard, BbSectionHeader, BbTimerBanner } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { GroupDeal, GroupDealOption } from "types/group-deal"
import { getOptionRemainingQuantity } from "types/group-deal"
import type { BbMemberSeatStatus } from "@modules/design-system"

const HOLD_SECONDS = 5 * 60

export type SelectedSeat = {
  optionId: string
  label: string
  unitPrice: number
}

type MemberSeatPickerProps = {
  deal: GroupDeal
  selectedSeat: SelectedSeat | null
  onSelect: (seat: SelectedSeat | null) => void
  holdExpiresAt: number | null
  onHoldStart: (expiresAt: number) => void
}

const MemberSeatPicker = ({
  deal,
  selectedSeat,
  onSelect,
  holdExpiresAt,
  onHoldStart,
}: MemberSeatPickerProps) => {
  const t = useDictionary()
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null)

  const memberOptions = useMemo(
    () =>
      (deal.options ?? []).filter((option) => option.option_type === "member"),
    [deal.options]
  )

  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSecondsLeft(null)
      return
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((holdExpiresAt - Date.now()) / 1000)
      )
      setHoldSecondsLeft(remaining)

      if (remaining <= 0) {
        onSelect(null)
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)

    return () => window.clearInterval(timer)
  }, [holdExpiresAt, onSelect])

  if (!memberOptions.length) {
    return null
  }

  const selectSeat = (option: GroupDealOption) => {
    const remaining = getOptionRemainingQuantity(option)

    if (remaining != null && remaining <= 0) {
      return
    }

    const unitPrice = option.deal_price ?? deal.deal_price
    const seat: SelectedSeat = {
      optionId: option.id,
      label: option.label,
      unitPrice,
    }

    onSelect(seat)
    onHoldStart(Date.now() + HOLD_SECONDS * 1000)
  }

  const formatHold = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    return {
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(secs).padStart(2, "0"),
    }
  }

  const holdTime =
    holdSecondsLeft != null ? formatHold(holdSecondsLeft) : null

  const resolveStatus = (option: GroupDealOption): BbMemberSeatStatus => {
    const remaining = getOptionRemainingQuantity(option)
    const isVacant = remaining == null || remaining > 0

    if (selectedSeat?.optionId === option.id) {
      return "selected"
    }

    if (!isVacant) {
      return "full"
    }

    return "vacant"
  }

  return (
    <section className="flex flex-col gap-y-4">
      <BbSectionHeader title={t.groupBuying.memberSeatsTitle} />

      <div className="flex flex-col gap-2">
        {memberOptions.map((option) => {
          const remaining = getOptionRemainingQuantity(option)
          const status = resolveStatus(option)
          const price = option.deal_price ?? deal.deal_price

          const statusLabel =
            status === "full"
              ? t.groupBuying.seatClosed
              : status === "selected"
                ? t.groupBuying.seatVacant
                : t.groupBuying.seatVacant

          return (
            <BbMemberSeatCard
              key={option.id}
              member={option.label}
              priceLabel={convertToLocale({
                amount: price,
                currency_code: deal.currency_code,
              })}
              status={status}
              statusLabel={statusLabel}
              remaining={remaining}
              onClick={() => selectSeat(option)}
            />
          )
        })}
      </div>

      {holdTime && selectedSeat && (
        <BbTimerBanner>
          {t.groupBuying.seatHoldActive
            .replace("{minutes}", holdTime.minutes)
            .replace("{seconds}", holdTime.seconds)}
        </BbTimerBanner>
      )}

      {selectedSeat && (
        <Text className="text-sm text-[var(--bb-mute)]">
          {t.groupBuying.selectedSeatSummary.replace(
            "{member}",
            selectedSeat.label
          )}
        </Text>
      )}
    </section>
  )
}

export default MemberSeatPicker
