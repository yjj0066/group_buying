"use client"

import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbEmptyState,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type DealDepositExpiredViewProps = {
  countryCode: string
  dealId: string
  dealTitle: string
}

const DealDepositExpiredView = ({
  countryCode,
  dealId,
  dealTitle,
}: DealDepositExpiredViewProps) => {
  const t = useDictionary()
  const router = useRouter()

  return (
    <div className="flex flex-col gap-5 pb-8 pt-4">
      <BbEmptyState
        message={t.groupBuying.depositExpiredTitle}
        description={t.groupBuying.depositExpiredDescription}
        className="border-[#E5E7EB] bg-[#F3F4F6] py-12"
      />
      <p className="text-center text-xs text-[#9CA3AF]">{dealTitle}</p>

      <BbButton
        fullWidth
        onClick={() => router.push(gbAppRoutes.deal(countryCode, dealId))}
      >
        {t.groupBuying.depositExpiredReapply}
      </BbButton>

      <BbAlert variant="warn">
        금액을 잘못 입금하신 경우{"\n"}고객센터로 문의해 주세요
      </BbAlert>

      <LocalizedClientLink
        href={gbAppRoutes.mySupport(countryCode)}
        className="text-center text-sm text-[#6B46E5] underline"
      >
        {t.account.nav.customerService}
      </LocalizedClientLink>
    </div>
  )
}

export default DealDepositExpiredView
