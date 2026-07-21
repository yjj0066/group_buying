"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { joinGroupDealWaitlist } from "@lib/data/group-deal-waitlist"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type WaitlistFormProps = {
  deal?: GroupDeal | null
  initialMember?: string
  initialOptionId?: string
  initialEmail?: string | null
  variant?: "page" | "inline"
  onRegistered?: () => void
}

const WaitlistForm = ({
  deal = null,
  initialMember = "",
  initialOptionId = "",
  initialEmail = null,
  variant = "page",
  onRegistered,
}: WaitlistFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()

  const dealId = deal?.id ?? searchParams.get("dealId") ?? ""
  const [member, setMember] = useState(
    initialMember || searchParams.get("member") || ""
  )
  const [optionId, setOptionId] = useState(
    initialOptionId || searchParams.get("optionId") || ""
  )
  const [email, setEmail] = useState(
    initialEmail ?? searchParams.get("email") ?? ""
  )
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMember) {
      setMember(initialMember)
    }
  }, [initialMember])

  useEffect(() => {
    if (initialOptionId) {
      setOptionId(initialOptionId)
    }
  }, [initialOptionId])

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const memberOptions =
    deal?.options?.filter((option) => option.option_type === "member") ?? []

  const handleSubmit = async () => {
    if (!dealId) {
      setError(t.groupBuying.waitlistError)
      return
    }

    if (!emailEnabled || !email.trim()) {
      setError("이메일을 입력해 주세요.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const resolvedOptionId =
        optionId ||
        memberOptions.find((option) => option.label === member)?.id ||
        ""

      await joinGroupDealWaitlist(dealId, {
        email: email.trim(),
        quantity: 1,
        selections: resolvedOptionId
          ? [{ option_id: resolvedOptionId, quantity: 1 }]
          : undefined,
      })

      setRegistered(true)
      onRegistered?.()
    } catch {
      setError(t.groupBuying.waitlistError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <div className="flex flex-col gap-4">
      {variant === "page" && (
        <BbSectionHeader
          title={t.groupBuying.waitlistButton}
          subtitle={t.groupBuying.waitlistDescription}
          className="mb-0"
        />
      )}

      {variant === "inline" && member && (
        <p className="text-sm text-[#4B5563]">
          {t.groupBuying.selectedSeatSummary.replace("{member}", member)}
        </p>
      )}

      {memberOptions.length > 0 ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[#111827]">
            {t.groupBuying.memberSeatsTitle}
          </span>
          <select
            className="bb-input"
            value={optionId || memberOptions.find((o) => o.label === member)?.id || ""}
            onChange={(event) => {
              const next = memberOptions.find(
                (option) => option.id === event.target.value
              )
              setOptionId(event.target.value)
              setMember(next?.label ?? "")
            }}
          >
            <option value="">{t.groupBuying.seatSelectRequired}</option>
            {memberOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[#111827]">
            {t.groupBuying.favoriteMemberPlaceholder ?? "멤버"}
          </span>
          <input
            className="bb-input"
            value={member}
            onChange={(event) => setMember(event.target.value)}
            placeholder={searchParams.get("q") ?? ""}
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-[#111827]">{t.groupBuying.email}</span>
        <input
          className="bb-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          required
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-[#4B5563]">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(event) => setEmailEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-[#E5E7EB] text-[#6B46E5]"
        />
        {t.groupBuying.waitlistSuccessNote}
      </label>

      {error && <BbAlert variant="error">{error}</BbAlert>}

      {registered ? (
        <>
          <BbAlert variant="success">{t.groupBuying.waitlistSuccess}</BbAlert>
          {variant === "page" && (
            <BbButton
              variant="secondary"
              fullWidth
              onClick={() => router.push(gbAppRoutes.search(countryCode))}
            >
              {t.landing.viewAll}
            </BbButton>
          )}
        </>
      ) : (
        <BbButton fullWidth isLoading={isSubmitting} onClick={handleSubmit}>
          {t.groupBuying.cardWaitlistLabel}
        </BbButton>
      )}

      <Text className="text-xs text-[#9CA3AF]">{t.groupBuying.waitlistHint}</Text>
    </div>
  )

  if (variant === "inline") {
    return content
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BbCard padding="md">{content}</BbCard>
    </div>
  )
}

export default WaitlistForm
