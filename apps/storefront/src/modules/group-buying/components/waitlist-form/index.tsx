"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

import { joinGroupDealWaitlist } from "@lib/data/group-deals"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type WaitlistFormProps = {
  deal: GroupDeal
}

const WaitlistForm = ({ deal }: WaitlistFormProps) => {
  const t = useDictionary()
  const params = useParams()
  const countryCode =
    typeof params.countryCode === "string" ? params.countryCode : "kr"

  const [email, setEmail] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await joinGroupDealWaitlist(deal.id, {
        email,
        quantity,
      })

      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.groupBuying.waitlistError
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <Text className="font-medium text-emerald-900">
          {t.groupBuying.waitlistSuccess}
        </Text>
        <Text className="mt-2 text-sm text-emerald-800">
          {t.groupBuying.waitlistSuccessNote}
        </Text>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
      <Text className="text-small-regular text-ui-fg-subtle">
        {t.groupBuying.waitlistDescription}
      </Text>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="waitlist-email">{t.groupBuying.email}</Label>
        <Input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="waitlist-quantity">{t.groupBuying.quantity}</Label>
        <Input
          id="waitlist-quantity"
          type="number"
          min={1}
          max={10}
          required
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
      </div>

      {error && (
        <Text className="text-small-regular text-ui-fg-error">{error}</Text>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t.groupBuying.joining : t.groupBuying.waitlistButton}
      </Button>

      <Text className="text-xs text-ui-fg-subtle">
        {countryCode.toUpperCase()} · {t.groupBuying.waitlistHint}
      </Text>
    </form>
  )
}

export default WaitlistForm
