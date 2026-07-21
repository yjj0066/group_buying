"use client"

import Image from "next/image"
import { Suspense, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import {
  calculateDealApplicationTotal,
  GROUP_BUYING_PLATFORM_FEE,
  GROUP_BUYING_SHIPPING_FEE,
} from "@lib/constants/group-buying-fees"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  dealRequiresOptionSelection,
  getDealSeatOptions,
  getSelectableDealOptions,
} from "@lib/util/group-deal-options"
import DealTimeline from "@modules/group-buying/components/deal-timeline"
import LeaderTrustPanel from "@modules/group-buying/components/leader-trust-panel"
import WaitlistForm from "@modules/group-buying/components/waitlist-form"
import {
  BbBanner,
  BbButton,
  BbKeyValue,
  BbMemberSeatCard,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal, GroupDealOption } from "types/group-deal"
import {
  getDaysUntilDeadline,
  getOptionRemainingQuantity,
} from "types/group-deal"
import { convertToLocale } from "@lib/util/money"
import type { BbMemberSeatStatus } from "@modules/design-system"

type DealDetailViewProps = {
  deal: GroupDeal
  heroImageUrl?: string | null
  customerEmail?: string | null
  /** Wireframe DETL-C: all member seats closed, waitlist only */
  allSeatsClosed?: boolean
}

const DealDetailView = ({
  deal,
  heroImageUrl = null,
  customerEmail = null,
  allSeatsClosed = false,
}: DealDetailViewProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [selectedOptionId, setSelectedOptionId] = useState("")
  const [waitlistOption, setWaitlistOption] = useState<GroupDealOption | null>(
    null
  )
  const [waitlistPanelOpen, setWaitlistPanelOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [optionError, setOptionError] = useState<string | null>(null)

  const requiresSeatSelection = useMemo(
    () => dealRequiresOptionSelection(deal),
    [deal]
  )

  const seatOptions = useMemo(() => getDealSeatOptions(deal), [deal])

  const selectableOptions = useMemo(
    () => getSelectableDealOptions(deal),
    [deal]
  )

  const selectedOption = useMemo(
    () => selectableOptions.find((option) => option.id === selectedOptionId) ?? null,
    [selectableOptions, selectedOptionId]
  )

  const daysLeft = getDaysUntilDeadline(deal)
  const primarySeller =
    (deal.metadata?.primary_seller as string | undefined) ??
    (deal.metadata?.seller as string | undefined) ??
    "위버스샵"
  const expectedShip =
    (deal.metadata?.expected_ship_date as string | undefined) ?? "8/10"
  const albumsNeeded = deal.target_quantity ?? deal.min_participants

  const unitPrice = selectedOption?.deal_price ?? deal.deal_price
  const priceBreakdown = calculateDealApplicationTotal(unitPrice, quantity)

  const formatMoney = (amount: number) =>
    convertToLocale({
      amount,
      currency_code: deal.currency_code,
    })

  const isSeatFull = (option: GroupDealOption) => {
    const remaining = getOptionRemainingQuantity(option)
    return remaining != null && remaining <= 0
  }

  const handleSeatClick = (option: GroupDealOption) => {
    setOptionError(null)

    if (allSeatsClosed || isSeatFull(option)) {
      setSelectedOptionId("")
      setWaitlistOption(option)
      setWaitlistPanelOpen(true)
      return
    }

    setWaitlistOption(null)
    setWaitlistPanelOpen(false)
    setSelectedOptionId(option.id)
    setQuantity(1)
  }

  const handleApply = () => {
    if (requiresSeatSelection && !selectedOption) {
      setOptionError(t.groupBuying.optionSelectRequired)
      return
    }

    setOptionError(null)

    const params = new URLSearchParams({
      quantity: String(quantity),
    })

    if (selectedOption) {
      params.set("optionId", selectedOption.id)
      params.set("member", selectedOption.label)
    }

    router.push(
      `${gbAppRoutes.dealApply(countryCode, deal.id)}?${params.toString()}`
    )
  }

  const resolveSeatStatus = (option: GroupDealOption): BbMemberSeatStatus => {
    if (allSeatsClosed) {
      if (waitlistOption?.id === option.id) {
        return "hold"
      }

      return "full"
    }

    if (waitlistOption?.id === option.id) {
      return "hold"
    }

    if (selectedOptionId === option.id) {
      return "hold"
    }

    if (isSeatFull(option)) {
      return "full"
    }

    return "vacant"
  }

  const resolveSeatLabel = (
    option: GroupDealOption,
    status: BbMemberSeatStatus
  ) => {
    if (waitlistOption?.id === option.id) {
      return t.groupBuying.cardWaitlistLabel
    }

    if (status === "full") {
      return t.groupBuying.seatClosed
    }

    if (status === "hold") {
      return "신청 중"
    }

    return t.groupBuying.seatVacant
  }

  const applyButtonLabel = `${t.groupBuying.applyButton} · ${formatMoney(priceBreakdown.total)}`

  const closedCheckoutPanel = (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm">
      {waitlistPanelOpen && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <WaitlistForm
              deal={deal}
              initialMember={waitlistOption?.label ?? ""}
              initialOptionId={waitlistOption?.id ?? ""}
              initialEmail={customerEmail}
              variant="inline"
            />
          </Suspense>
        </div>
      )}

      {!waitlistPanelOpen && (
        <BbButton
          variant="cta"
          fullWidth
          className="h-12"
          onClick={() => setWaitlistPanelOpen(true)}
        >
          {t.groupBuying.waitlistButton}
        </BbButton>
      )}

      <BbButton
        variant="secondary"
        fullWidth
        className="mt-3 h-12"
        disabled
      >
        {t.groupBuying.applyButton}
      </BbButton>
    </div>
  )

  const checkoutPanel = allSeatsClosed ? (
    closedCheckoutPanel
  ) : waitlistOption ? (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm">
      <p className="text-sm font-medium text-[#6B7280]">
        {t.groupBuying.waitlistButton}
      </p>
      <p className="mt-2 text-base font-bold text-[#111827]">
        {waitlistOption.label}
      </p>
      <div className="mt-4">
        <Suspense fallback={null}>
          <WaitlistForm
            deal={deal}
            initialMember={waitlistOption.label}
            initialOptionId={waitlistOption.id}
            initialEmail={customerEmail}
            variant="inline"
          />
        </Suspense>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm">
      <p className="text-sm font-medium text-[#6B7280]">
        {t.groupBuying.estimatedTotalLabel}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">
        {formatMoney(priceBreakdown.total)}
      </p>
      {selectedOption && (
        <p className="mt-4 text-sm text-[#4B5563]">
          {t.groupBuying.selectedSeatSummary.replace(
            "{member}",
            selectedOption.label
          )}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-[#9CA3AF]">
        {t.groupBuying.platformFeeLabel} {formatMoney(GROUP_BUYING_PLATFORM_FEE)}
        <br />
        {t.groupBuying.shippingFeeLabel} {formatMoney(GROUP_BUYING_SHIPPING_FEE)}
      </p>
      <BbButton variant="cta" fullWidth className="mt-6 h-12" onClick={handleApply}>
        {applyButtonLabel}
      </BbButton>
    </div>
  )

  return (
    <div className="w-full">
      <div className="grid gap-10 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)_340px] xl:gap-12">
        <div className="xl:sticky xl:top-24 xl:self-start">
          {heroImageUrl ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6]">
              <Image
                src={heroImageUrl}
                alt={deal.title}
                fill
                className="object-contain p-8"
                sizes="(max-width: 1280px) 100vw, 420px"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F3F4F6] text-sm text-[#9CA3AF]">
              굿즈 사진
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          {allSeatsClosed && (
            <BbBanner>{t.groupBuying.cardClosedOverlay}</BbBanner>
          )}

          <header className="border-b border-[#E5E7EB] pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
              {deal.title}
            </h1>
            {deal.description && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6B7280]">
                {deal.description}
              </p>
            )}
            <BbKeyValue
              className="mt-6 max-w-xl"
              items={[
                { label: "1차 판매처", value: primarySeller },
                {
                  label: "마감",
                  value: daysLeft > 0 ? `D-${daysLeft}` : "D-Day",
                },
                { label: "예상 발송", value: expectedShip },
                { label: "필요 앨범", value: `${albumsNeeded}장` },
              ]}
            />
          </header>

          <div className="xl:hidden">{checkoutPanel}</div>

          <section className="flex flex-col gap-4">
            {requiresSeatSelection && (
              <>
                <h2 className="text-lg font-bold text-[#111827]">자리 선택</h2>
                {!allSeatsClosed && (
                  <Text className="text-sm text-[#6B7280]">
                    {t.groupBuying.waitlistSeatHint}
                  </Text>
                )}
                {allSeatsClosed && (
                  <Text className="text-sm text-[#6B7280]">
                    {t.groupBuying.waitlistDescription}
                  </Text>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {seatOptions.map((option) => {
                    const status = resolveSeatStatus(option)
                    const remaining = getOptionRemainingQuantity(option)

                    return (
                      <BbMemberSeatCard
                        key={option.id}
                        member={option.label}
                        priceLabel={formatMoney(option.deal_price)}
                        status={status}
                        statusLabel={resolveSeatLabel(option, status)}
                        remaining={remaining}
                        onClick={() => handleSeatClick(option)}
                      />
                    )
                  })}
                </div>
                {optionError && (
                  <Text className="text-sm text-rose-600">{optionError}</Text>
                )}
              </>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <LeaderTrustPanel deal={deal} />
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-[#111827]">구매 증빙</h2>
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-12 text-center text-sm text-[#9CA3AF]">
                {t.groupBuying.receiptHiddenUntilPurchase}
              </div>
            </section>
          </div>

          <DealTimeline deal={deal} />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24">{checkoutPanel}</div>
        </aside>
      </div>
    </div>
  )
}

export default DealDetailView
