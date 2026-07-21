"use client"

import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbBanner,
  BbButton,
  BbMemberSeatCard,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import {
  getOptionRemainingQuantity,
} from "types/group-deal"
import { convertToLocale } from "@lib/util/money"

type DealClosedViewProps = {
  deal: GroupDeal
}

const DealClosedView = ({ deal }: DealClosedViewProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  return (
    <div className="flex flex-col gap-5 pb-8">
      <BbBanner>마감된 공구입니다</BbBanner>

      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F3F4F6] text-sm text-[#9CA3AF]">
        굿즈 사진
      </div>

      <h1 className="text-lg font-bold text-[#111827]">{deal.title}</h1>

      <section className="flex flex-col gap-2">
        <BbSectionHeader title={t.groupBuying.memberSeatsTitle} className="mb-0" />
        <div className="flex flex-col gap-2">
          {memberOptions.map((option) => (
            <BbMemberSeatCard
              key={option.id}
              member={option.label}
              priceLabel={convertToLocale({
                amount: option.deal_price,
                currency_code: deal.currency_code,
              })}
              status="full"
              statusLabel={t.groupBuying.seatClosed}
              remaining={getOptionRemainingQuantity(option)}
              onClick={() =>
                router.push(
                  `${gbAppRoutes.waitlist(countryCode)}?${new URLSearchParams({
                    dealId: deal.id,
                    member: option.label,
                    optionId: option.id,
                  }).toString()}`
                )
              }
            />
          ))}
        </div>
      </section>

      <BbButton
        fullWidth
        onClick={() =>
          router.push(
            `${gbAppRoutes.waitlist(countryCode)}?${new URLSearchParams({
              dealId: deal.id,
            }).toString()}`
          )
        }
      >
        {t.groupBuying.waitlistButton}
      </BbButton>

      <BbButton variant="secondary" fullWidth disabled>
        {t.groupBuying.applyButton}
      </BbButton>
    </div>
  )
}

export default DealClosedView
