"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  buildMemberQuantityTotals,
  buildPackingTableRows,
} from "@lib/util/seller-deal-dashboard-data"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerPackingViewProps = {
  deal: GroupDeal
  participations?: LeaderDealParticipation[]
}

const SellerPackingView = ({
  deal,
  participations = [],
}: SellerPackingViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const packingRows = useMemo(
    () => buildPackingTableRows(participations),
    [participations]
  )

  const memberTotals = useMemo(
    () => buildMemberQuantityTotals(deal, participations),
    [deal, participations]
  )

  return (
    <LeaderWireframeShell screenId="PACK" title="포장 취합표">
      <div className="flex flex-col gap-6">
        <BbSectionHeader
          title="포장 취합표 (자동 생성)"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <BbTable
          columns={["참여자", "멤버", "수량", "배송지"]}
          rows={packingRows}
        />

        <div>
          <BbSectionHeader
            title="멤버별 합계"
            className="mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
          />
          <BbKeyValue
            items={memberTotals.map((item) => ({
              label: item.label,
              value: `${item.quantity}장`,
            }))}
          />
        </div>

        <div className="flex gap-2">
          <BbButton
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg border-[#E5E7EB]"
          >
            인쇄
          </BbButton>
          <BbButton
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg border-[#E5E7EB]"
          >
            엑셀 다운로드
          </BbButton>
        </div>

        <div className="rounded-xl border-l-2 border-[#D9D6E8] bg-[#F7F6FB] px-4 py-3 text-xs text-[#6B7280]">
          이 단계부터 배송지 마스킹 해제
        </div>

        <BbButton
          variant="cta"
          onClick={() =>
            router.push(gbAppRoutes.sellerPurchaseProof(countryCode, deal.id))
          }
        >
          1차 구매 진행하기
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerPackingView
