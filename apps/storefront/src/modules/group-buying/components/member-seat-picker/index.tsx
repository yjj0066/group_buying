"use client"

import { useEffect, useMemo, useState } from "react"

import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { GroupDeal, GroupDealOption } from "types/group-deal"
import { getOptionRemainingQuantity } from "types/group-deal"

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

  return (
    <section className="flex flex-col gap-y-3">
      <Text className="text-sm font-semibold text-ui-fg-base">
        {t.groupBuying.memberSeatsTitle}
      </Text>

      <div className="grid grid-cols-2 gap-2 small:grid-cols-3">
        {memberOptions.map((option) => {
          const remaining = getOptionRemainingQuantity(option)
          const isVacant = remaining == null || remaining > 0
          const isSelected = selectedSeat?.optionId === option.id
          const price = option.deal_price ?? deal.deal_price

          return (
            <button
              key={option.id}
              type="button"
              disabled={!isVacant}
              onClick={() => selectSeat(option)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                isSelected
                  ? "border-brand-pink bg-brand-pink/5 ring-2 ring-brand-pink/30"
                  : isVacant
                    ? "border-ui-border-base hover:border-brand-pink/40"
                    : "cursor-not-allowed border-ui-border-base bg-ui-bg-subtle opacity-60"
              }`}
            >
              <Text className="text-sm font-semibold">{option.label}</Text>
              <Text className="mt-1 text-xs text-ui-fg-subtle">
                {convertToLocale({
                  amount: price,
                  currency_code: deal.currency_code,
                })}
              </Text>
              <Text
                className={`mt-2 text-[10px] font-medium ${
                  isVacant ? "text-sky-700" : "text-ui-fg-muted"
                }`}
              >
                {isVacant
                  ? remaining == null
                    ? t.groupBuying.seatVacant
                    : `${t.groupBuying.seatVacant} (${remaining})`
                  : t.groupBuying.seatClosed}
              </Text>
            </button>
          )
        })}
      </div>

      {holdTime && selectedSeat && (
        <Text className="text-sm font-semibold text-brand-pink">
          {t.groupBuying.seatHoldActive
            .replace("{minutes}", holdTime.minutes)
            .replace("{seconds}", holdTime.seconds)}
        </Text>
      )}
    </section>
  )
}

export default MemberSeatPicker
