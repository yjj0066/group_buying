"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { startGroupDealCheckout } from "@lib/data/group-deals"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
import WaitlistForm from "@modules/group-buying/components/waitlist-form"
import type { SelectedSeat } from "@modules/group-buying/components/member-seat-picker"
import {
  GroupDeal,
  isDealSoldOut,
  isJoinableGroupDealStatus,
} from "types/group-deal"

type JoinDealFormProps = {
  deal: GroupDeal
  selectedSeat?: SelectedSeat | null
  holdExpiresAt?: number | null
  requiresSeat?: boolean
}

const JoinDealForm = ({
  deal,
  selectedSeat = null,
  holdExpiresAt = null,
  requiresSeat = false,
}: JoinDealFormProps) => {
  const router = useRouter()
  const params = useParams()
  const t = useDictionary()

  const countryCode =
    typeof params.countryCode === "string" ? params.countryCode : "kr"

  const [email, setEmail] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isJoinable = isJoinableGroupDealStatus(deal.status)
  const isSoldOut = isDealSoldOut(deal)
  const isDemoDeal = deal.metadata?.is_demo === true
  const isProductPreview = deal.metadata?.is_product_preview === true
  const holdExpired =
    holdExpiresAt != null && holdExpiresAt <= Date.now()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (requiresSeat && !selectedSeat) {
      setError(t.groupBuying.seatSelectRequired)
      return
    }

    if (holdExpiresAt && holdExpired) {
      setError(t.groupBuying.seatHoldExpired)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await startGroupDealCheckout(deal.id, {
        email,
        quantity,
        countryCode,
        selections: selectedSeat
          ? [{ option_id: selectedSeat.optionId, quantity }]
          : undefined,
      })

      router.push(`/${countryCode}/checkout`)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.groupBuying.joinError
      )
    } finally {
      setLoading(false)
    }
  }

  if (isSoldOut) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-medium text-amber-900">
            {t.groupBuying.joinClosedFull}
          </Text>
        </div>
        <WaitlistForm deal={deal} />
      </div>
    )
  }

  if (!isJoinable || isProductPreview) {
    return (
      <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-6">
        <Text className="text-ui-fg-subtle">
          {isProductPreview
            ? t.groupBuying.productPreviewNotice
            : t.groupBuying.joinClosedInactive}
        </Text>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
      {isDemoDeal && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Text className="text-sm font-medium text-blue-900">
            {t.groupBuying.demoDealNotice}
          </Text>
        </div>
      )}

      {selectedSeat && (
        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
          <Text className="text-sm font-medium text-ui-fg-base">
            {t.groupBuying.selectedSeatSummary.replace(
              "{member}",
              selectedSeat.label
            )}
          </Text>
        </div>
      )}

      <Text className="text-small-regular text-ui-fg-subtle">
        {t.groupBuying.seatHoldNotice}
      </Text>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="email">{t.groupBuying.email}</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="quantity">{t.groupBuying.quantity}</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={10}
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>

      {error && (
        <Text className="text-small-regular text-ui-fg-error">{error}</Text>
      )}

      <Button
        type="submit"
        disabled={loading || isDemoDeal || (requiresSeat && !selectedSeat)}
        className="w-full"
      >
        {loading ? t.groupBuying.joining : t.groupBuying.applyButton}
      </Button>
    </form>
  )
}

export default JoinDealForm
