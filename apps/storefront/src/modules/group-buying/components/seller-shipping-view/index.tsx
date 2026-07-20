"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import AiVerificationPanel from "@modules/group-buying/components/ai-verification-panel"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { GroupDealDocumentParseResponse } from "types/group-deal-document-ai"

type SellerShippingViewProps = {
  deal: GroupDeal
}

const SHIP_ROWS = [
  ["민지팬", "1234-5678-9012", "매칭완료"],
  ["하늘", "9876-5432-1098", "확인필요"],
  ["별빛", "5555-4444-3333", "매칭완료"],
]

const SellerShippingView = ({ deal }: SellerShippingViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [result, setResult] = useState<GroupDealDocumentParseResponse | null>(
    null
  )
  const [manualTracking, setManualTracking] = useState("")

  const matchedCount = result?.document_ai.auto_matched_participant_ids?.length ?? 8
  const conflictCount =
    (result?.document_ai as { conflict_participant_ids?: string[] })
      ?.conflict_participant_ids?.length ?? 2

  return (
    <LeaderWireframeShell screenId="SHIP" title="발송 관리">
      <div className="flex flex-col gap-6">
        <BbSectionHeader
          title="송장 캡처 업로드"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center text-sm text-[#6B7280] whitespace-pre-line">
          택배사 앱 접수내역 캡처{"\n"}여러 장·스크롤 캡처 가능
        </div>

        <AiVerificationPanel
          groupDealId={deal.id}
          mode="shipping"
          uploadLabel="송장·운송장 업로드"
          onComplete={setResult}
        />

        <BbSectionHeader
          title="자동 매칭 결과"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <BbTable columns={["참여자", "송장", "상태"]} rows={SHIP_ROWS} />
        <BbKeyValue
          items={[
            { label: "매칭 완료", value: `${matchedCount}건` },
            { label: "확인 필요", value: `${conflictCount}건` },
            { label: "미매칭", value: "0건" },
          ]}
        />

        <BbSectionHeader
          title="수동 입력"
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />
        <input
          className="bb-input"
          placeholder="송장번호 직접 입력"
          value={manualTracking}
          onChange={(event) => setManualTracking(event.target.value)}
        />
        <p className="text-xs text-[#6B7280]">
          인식 실패해도 항상 열려 있는 경로
        </p>

        <BbButton
          variant="cta"
          onClick={() => {
            if (conflictCount > 0) {
              router.push(
                gbAppRoutes.sellerShippingConfirm(countryCode, deal.id)
              )
              return
            }
            router.push(gbAppRoutes.sellerSettlement(countryCode, deal.id))
          }}
        >
          발송 확정
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerShippingView
