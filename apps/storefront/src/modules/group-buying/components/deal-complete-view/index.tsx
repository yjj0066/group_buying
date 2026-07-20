"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { CheckCircleSolid } from "@medusajs/icons"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { BbAlert, BbButton, BbCard, BbKeyValue } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import type { AccountParticipation } from "types/account-group-deals"
import type { GroupDeal } from "types/group-deal"

export type DealApplicationSummary = {
  productTitle?: string
  paymentAmount?: number
  currencyCode?: string
  shippingAddress?: string
  recipientName?: string
  member?: string
}

export const dealApplicationSummaryKey = (participantId: string) =>
  `gb-application-summary-${participantId}`

type DealCompleteViewProps = {
  deal: GroupDeal
  participation?: AccountParticipation | null
  participantId?: string
  depositConfirmed?: boolean
}

const DealCompleteView = ({
  deal,
  participation = null,
  participantId,
  depositConfirmed = false,
}: DealCompleteViewProps) => {
  const t = useDictionary()
  const { countryCode } = useParams() as { countryCode: string }
  const [summary, setSummary] = useState<DealApplicationSummary>({})

  useEffect(() => {
    if (!participantId || typeof window === "undefined") {
      return
    }

    const raw = sessionStorage.getItem(dealApplicationSummaryKey(participantId))

    if (!raw) {
      return
    }

    try {
      setSummary(JSON.parse(raw) as DealApplicationSummary)
    } catch {
      setSummary({})
    }
  }, [participantId])

  const productTitle =
    summary.productTitle ?? participation?.group_deal.title ?? deal.title

  const paymentAmountLabel = useMemo(() => {
    const amount = summary.paymentAmount
    const currencyCode =
      summary.currencyCode ??
      participation?.group_deal.currency_code ??
      deal.currency_code

    if (amount == null) {
      return "-"
    }

    return convertToLocale({
      amount,
      currency_code: currencyCode,
    })
  }, [summary, participation, deal.currency_code])

  const shippingAddressLabel = useMemo(() => {
    const address = summary.shippingAddress?.trim()
    const recipient = summary.recipientName?.trim()

    if (recipient && address) {
      return `${recipient} · ${address}`
    }

    return address || recipient || "-"
  }, [summary])

  const title = depositConfirmed
    ? t.groupBuying.applicationCompleteSuccessTitle
    : t.groupBuying.applicationCompletePendingTitle

  return (
    <div className="flex min-h-[60vh] flex-col gap-5 pb-8 pt-4">
      <div className="rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-4 py-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
          <CheckCircleSolid className="h-8 w-8 text-[#166534]" />
        </div>
        <h1 className="mt-3 text-lg font-bold leading-snug text-[#166534]">
          {title}
        </h1>
      </div>

      <BbCard padding="md">
        <BbKeyValue
          items={[
            {
              label: t.groupBuying.applicationCompleteSummaryProduct,
              value: productTitle,
            },
            {
              label: t.groupBuying.applicationCompleteSummaryAmount,
              value: paymentAmountLabel,
            },
            {
              label: t.groupBuying.applicationCompleteSummaryAddress,
              value: shippingAddressLabel,
            },
          ]}
        />
      </BbCard>

      <BbAlert variant="info">
        {t.groupBuying.seatHoldNotice}
      </BbAlert>

      <div className="mt-auto flex flex-col gap-3">
        <LocalizedClientLink href={gbAppRoutes.participations(countryCode)}>
          <BbButton variant="cta" fullWidth>
            {t.groupBuying.applicationCompleteViewParticipations}
          </BbButton>
        </LocalizedClientLink>

        <LocalizedClientLink href={gbAppRoutes.home(countryCode)}>
          <BbButton variant="secondary" fullWidth>
            {t.groupBuying.applicationCompleteGoHome}
          </BbButton>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default DealCompleteView
