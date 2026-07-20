"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import AiVerificationPanel from "@modules/group-buying/components/ai-verification-panel"
import { resolveDeclaredAlbumQuantity } from "@lib/util/leader-opening-shortage"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LeaderWireframeShell from "@modules/group-buying/components/leader-wireframe-shell"
import {
  BbButton,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { GroupDealDocumentParseResponse } from "types/group-deal-document-ai"
import { convertToLocale } from "@lib/util/money"

type SellerPurchaseViewProps = {
  deal: GroupDeal
}

const SellerPurchaseView = ({ deal }: SellerPurchaseViewProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [result, setResult] = useState<GroupDealDocumentParseResponse | null>(
    null
  )

  const declaredAlbumQuantity = useMemo(
    () => resolveDeclaredAlbumQuantity(deal),
    [deal]
  )

  const primarySeller =
    (deal.metadata?.primary_seller as string | undefined)?.trim() || "미입력"

  const totalEscrow = useMemo(() => {
    if (deal.deposit_amount && deal.current_participants) {
      return deal.deal_price * deal.current_participants
    }

    return deal.deal_price * (deal.target_quantity || deal.current_participants || 0)
  }, [deal])

  const isVerified =
    result?.group_deal.purchase_receipt_status === "verified" ||
    result?.document_ai.status === "parsed"

  const isFailed = result?.document_ai.status === "failed"

  return (
    <LeaderWireframeShell screenId="PURC" title="1차 구매·영수증">
      <div className="flex flex-col gap-6">
        <BbKeyValue
          items={[
            {
              label: "선언 앨범 수량",
              value: `${declaredAlbumQuantity}장`,
            },
            { label: "1차 판매처", value: primarySeller },
            {
              label: "총 보관액",
              value: convertToLocale({
                amount: totalEscrow,
                currency_code: deal.currency_code,
              }),
            },
            { label: "공구", value: deal.title },
          ]}
        />

        <BbSectionHeader
          title="영수증 캡처 업로드"
          subtitle={deal.title}
          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"
        />

        <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center text-sm text-[#6B7280] whitespace-pre-line">
          주문내역 캡처를 올려주세요{"\n"}모바일 캡처·다크모드·스크롤 캡처 가능
        </div>

        <AiVerificationPanel
          groupDealId={deal.id}
          mode="purchase"
          uploadLabel="영수증 업로드"
          onComplete={setResult}
        />

        <BbButton
          variant="cta"
          disabled={!result}
          onClick={() => {
            if (isFailed) {
              router.push(
                gbAppRoutes.sellerPurchaseFailed(countryCode, deal.id)
              )
              return
            }
            if (isVerified) {
              router.push(gbAppRoutes.sellerOpening(countryCode, deal.id))
            }
          }}
        >
          {isVerified
            ? "증빙 공개하고 다음 단계"
            : isFailed
              ? "검증 실패 · 소명 화면으로"
              : "영수증 분석 결과 확인"}
        </BbButton>
      </div>
    </LeaderWireframeShell>
  )
}

export default SellerPurchaseView
