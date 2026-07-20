"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import { BbAlert, BbButton, BbSectionHeader } from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"

type SellerPurchaseFailedViewProps = {
  deal: GroupDeal
}

const SellerPurchaseFailedView = ({ deal }: SellerPurchaseFailedViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [explanation, setExplanation] = useState("")
  const [submitted, setSubmitted] = useState(false)

  return (
    <LeaderWireframeShell screenId="PURC-F" title="영수증 검증 실패">
      <div className="flex flex-col gap-5">
        <BbAlert variant="error">
          영수증 자동 검증에 실패했습니다. 소명 내용을 작성하거나 영수증을
          다시 업로드해 주세요.
        </BbAlert>

        <BbSectionHeader
          title="실패 사유"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
          선언 앨범 수량·1차 판매처·결제 금액이 영수증과 일치하는지 확인해
          주세요.
        </div>

        <textarea
          className="bb-input min-h-28 resize-y"
          placeholder="소명 내용 (선택)"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
        />

        <div className="flex flex-col gap-3">
          <BbButton
            variant="cta"
            onClick={() => {
              setSubmitted(true)
              router.push(gbAppRoutes.sellerPurchaseProof(countryCode, deal.id))
            }}
          >
            영수증 다시 업로드
          </BbButton>
          <BbButton
            variant="secondary"
            onClick={() => router.push(gbAppRoutes.sellerDeal(countryCode, deal.id))}
          >
            대시보드로 돌아가기
          </BbButton>
        </div>

        {submitted ? (
          <BbAlert variant="info">소명이 저장되었습니다. 영수증을 다시 업로드해 주세요.</BbAlert>
        ) : null}
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerPurchaseFailedView
