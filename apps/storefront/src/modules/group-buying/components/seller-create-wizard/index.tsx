"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { GROUP_BUYING_DEMO_PRODUCT_ID } from "@lib/constants/group-buying-demo-product"
import {
  GROUP_BUYING_LEADER_DEPOSIT_AMOUNT,
  LEADER_DEPOSIT_DEADLINE_MINUTES,
} from "@lib/constants/group-buying-fees"
import { createHostedGroupDeal } from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbSteps,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"

type MemberSeatDraft = {
  label: string
  price: number
}

type CreateDraft = {
  idolGroup: string
  goodsType: string
  title: string
  primarySeller: string
  endsAt: string
  expectedShipDate: string
  shippingFee: string
  seats: MemberSeatDraft[]
  albumQuantity: string
}

const WIZARD_STEPS = ["공구 정보", "자리·가격", "앨범 수량", "보증금"]

const emptyDraft = (): CreateDraft => ({
  idolGroup: "",
  goodsType: "",
  title: "",
  primarySeller: "",
  endsAt: "",
  expectedShipDate: "",
  shippingFee: "",
  seats: [{ label: "", price: 0 }],
  albumQuantity: "",
})

export const SellerCreateWizard = () => {
  const t = useDictionary()
  const c = t.account.createGroupDeal
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CreateDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSeats = draft.seats.length
  const totalAmount = draft.seats.reduce((sum, seat) => sum + seat.price, 0)

  const patch = (partial: Partial<CreateDraft>) =>
    setDraft((current) => ({ ...current, ...partial }))

  const handleCreate = async () => {
    const activeSeats = draft.seats.filter(
      (seat) => seat.label.trim().length > 0 && seat.price > 0
    )

    if (!draft.title || !draft.idolGroup || !activeSeats.length) {
      setError(c.requiredFields)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const now = new Date()
      const endsAt =
        draft.endsAt ||
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const totalSeatsCount = activeSeats.length
      const primaryPrice = activeSeats[0]?.price ?? 0
      const maxPrice = Math.max(...activeSeats.map((seat) => seat.price), 0)

      const deal = await createHostedGroupDeal({
        title: draft.title,
        description: `${draft.idolGroup} · ${draft.goodsType}`,
        product_id: GROUP_BUYING_DEMO_PRODUCT_ID,
        min_participants: totalSeatsCount,
        target_quantity: totalSeatsCount,
        original_price: maxPrice,
        deal_price: primaryPrice,
        currency_code: "krw",
        starts_at: now.toISOString(),
        ends_at: endsAt,
        declared_album_quantity:
          Number(draft.albumQuantity) || totalSeatsCount,
        primary_seller: draft.primarySeller || undefined,
        expected_ship_date: draft.expectedShipDate || undefined,
        idol_group: draft.idolGroup,
        goods_type: draft.goodsType,
        member_seats: activeSeats.map((seat, index) => ({
          id: `seat-${index}`,
          label: seat.label.trim(),
          price: seat.price,
          quantity: 1,
        })),
      })

      sessionStorage.setItem(
        `gb-create-draft-${deal.id}`,
        JSON.stringify({
          ...draft,
          depositAmount: GROUP_BUYING_LEADER_DEPOSIT_AMOUNT,
          depositExpiresAt: new Date(
            Date.now() + LEADER_DEPOSIT_DEADLINE_MINUTES * 60 * 1000
          ).toISOString(),
        })
      )

      router.push(
        `${gbAppRoutes.sellerCreateDeposit(countryCode)}?dealId=${deal.id}`
      )
    } catch {
      setError(c.createError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbSectionHeader title={c.title} subtitle="4단계 마법사" />
      <BbSteps steps={WIZARD_STEPS} currentIndex={step} />

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <input
            className="bb-input"
            placeholder="아이돌·그룹 ▾"
            value={draft.idolGroup}
            onChange={(event) => patch({ idolGroup: event.target.value })}
          />
          <input
            className="bb-input"
            placeholder="굿즈명 / 유형 ▾"
            value={draft.goodsType}
            onChange={(event) => patch({ goodsType: event.target.value })}
          />
          <input
            className="bb-input"
            placeholder={c.titlePlaceholder}
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--bb-line)] bg-[var(--bb-surface)] text-sm text-[var(--bb-mute)]">
            상품 사진
          </div>
          <input
            className="bb-input"
            placeholder="1차 판매처"
            value={draft.primarySeller}
            onChange={(event) => patch({ primarySeller: event.target.value })}
          />
          <BbAlert variant="warn">
            오픈 후 수정 불가 · 영수증 검증 기준
          </BbAlert>
          <input
            className="bb-input"
            type="date"
            value={draft.endsAt ? draft.endsAt.slice(0, 10) : ""}
            onChange={(event) =>
              patch({
                endsAt: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : "",
              })
            }
          />
          <input
            className="bb-input"
            placeholder="예상 발송일"
            value={draft.expectedShipDate}
            onChange={(event) => patch({ expectedShipDate: event.target.value })}
          />
          <input
            className="bb-input"
            placeholder="예상 총 배송비"
            value={draft.shippingFee}
            onChange={(event) => patch({ shippingFee: event.target.value })}
          />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <Text className="text-sm font-bold text-[var(--bb-ink)]">
            2단계 · 멤버 자리·가격
          </Text>
          {draft.seats.map((seat, index) => (
            <div key={`seat-${index}`} className="flex gap-2">
              <input
                className="bb-input flex-1"
                value={seat.label}
                onChange={(event) => {
                  const seats = [...draft.seats]
                  seats[index] = { ...seat, label: event.target.value }
                  patch({ seats })
                }}
              />
              <input
                className="bb-input w-28"
                type="number"
                value={seat.price}
                onChange={(event) => {
                  const seats = [...draft.seats]
                  seats[index] = {
                    ...seat,
                    price: Number(event.target.value) || 0,
                  }
                  patch({ seats })
                }}
              />
            </div>
          ))}
          <BbKeyValue
            items={[
              { label: "총 자리수", value: String(totalSeats) },
              {
                label: "총 모집금액",
                value: convertToLocale({
                  amount: totalAmount,
                  currency_code: "krw",
                }),
              },
            ]}
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <Text className="text-sm font-bold text-[var(--bb-ink)]">
            3단계 · 필요 앨범 수량
          </Text>
          <input
            className="bb-input"
            value={draft.albumQuantity}
            onChange={(event) => patch({ albumQuantity: event.target.value })}
          />
          <BbAlert variant="info">영수증 자동 검증의 기준값</BbAlert>
        </div>
      )}

      {error && <BbAlert variant="error">{error}</BbAlert>}

      <div className="flex gap-2">
        {step > 0 && (
          <BbButton variant="secondary" onClick={() => setStep((s) => s - 1)}>
            {c.back}
          </BbButton>
        )}
        {step < 2 ? (
          <BbButton fullWidth onClick={() => setStep((s) => s + 1)}>
            {c.next}
          </BbButton>
        ) : (
          <BbButton fullWidth isLoading={isSubmitting} onClick={handleCreate}>
            {c.nextToDeposit}
          </BbButton>
        )}
      </div>
    </div>
  )
}

export default SellerCreateWizard
