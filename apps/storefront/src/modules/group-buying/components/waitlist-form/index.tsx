"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { joinGroupDealWaitlist } from "@lib/data/group-deals"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

const WaitlistForm = () => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()

  const [member, setMember] = useState(searchParams.get("member") ?? "")
  const [maxPrice, setMaxPrice] = useState("")
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await joinGroupDealWaitlist("waitlist", {
        email: emailEnabled ? "notify@example.com" : "",
        quantity: 1,
      })
      setRegistered(true)
    } catch {
      setError(t.groupBuying.waitlistError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BbCard padding="md">
        <BbSectionHeader
          title="자리 알림 받기"
          subtitle="자리가 열리면 즉시 알려드려요"
          className="mb-4"
        />

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-[#111827]">그룹·멤버 선택 ▾</span>
            <input
              className="bb-input"
              value={member}
              onChange={(event) => setMember(event.target.value)}
              placeholder={searchParams.get("q") ?? t.groupBuying.favoriteMemberPlaceholder}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-[#111827]">희망 가격 상한</span>
            <input
              className="bb-input"
              type="number"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="예: 20000"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm text-[#4B5563]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(event) => setPushEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#6B46E5]"
              />
              푸시 알림
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#6B46E5]"
              />
              이메일
            </label>
          </div>

          {error && <BbAlert variant="error">{error}</BbAlert>}

          {registered ? (
            <>
              <BbAlert variant="success">{t.groupBuying.waitlistSuccess}</BbAlert>
              <BbCard padding="sm" className="bg-[#F9FAFB]">
                <BbKeyValue
                  items={[
                    { label: "내 대기 순번", value: "3번" },
                    { label: "동일 조건 대기자", value: "12명" },
                  ]}
                />
              </BbCard>
              <BbAlert variant="warn">
                알림 도달 순서가 아니라{"\n"}홀드 획득 순서가 선착순 기준입니다
              </BbAlert>
              <button
                type="button"
                className="text-center text-sm text-[#6B46E5] underline"
                onClick={() => router.push(gbAppRoutes.search(countryCode))}
              >
                대기 취소
              </button>
            </>
          ) : (
            <BbButton fullWidth isLoading={isSubmitting} onClick={handleSubmit}>
              대기 등록
            </BbButton>
          )}

          <Text className="text-xs text-[#9CA3AF]">
            {t.groupBuying.waitlistHint}
          </Text>
        </div>
      </BbCard>
    </div>
  )
}

export default WaitlistForm
