"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import {
  cancelLeaderGroupDeal,
  closeLeaderDealRecruitment,
} from "@lib/data/leader-deal-actions"
import { convertToLocale } from "@lib/util/money"
import {
  buildKakaoShareUrl,
  buildParticipantApplyUrl,
  buildTwitterShareUrl,
  canCancelDeal,
  canCloseRecruitment,
} from "@lib/util/leader-recruitment"
import { filterDepositConfirmedParticipations } from "@lib/util/leader-order-finalize"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import {
  BbAlert,
  BbButton,
  BbEmptyState,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import SellerRecruitmentCancelModal from "@modules/group-buying/components/seller-recruitment-cancel-modal"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerRecruitmentViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const SellerRecruitmentView = ({
  deal,
  participations,
}: SellerRecruitmentViewProps) => {
  const t = useDictionary()
  const labels = t.account.hostedDeals.recruitment
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [copied, setCopied] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dealStatus, setDealStatus] = useState(deal.status)

  const confirmedParticipations = useMemo(
    () => filterDepositConfirmedParticipations(participations),
    [participations]
  )

  const applyUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return gbAppRoutes.dealApply(countryCode, deal.id)
    }

    return buildParticipantApplyUrl(
      window.location.origin,
      countryCode,
      deal.id,
      gbAppRoutes.dealApply
    )
  }, [countryCode, deal.id])

  const closeAllowed = canCloseRecruitment(deal, confirmedParticipations.length)
  const cancelAllowed = canCancelDeal(deal, confirmedParticipations.length)
  const isCancelled = dealStatus === "cancelled"

  const formatAmount = (amount: number) =>
    convertToLocale({
      amount,
      currency_code: deal.currency_code,
    })

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(applyUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError(labels.copyError)
    }
  }

  const handleShare = async (platform: "kakao" | "twitter" | "native") => {
    const shareTitle = deal.title

    if (platform === "native" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url: applyUrl })
        return
      } catch {
        // fall through to copy
      }
    }

    const shareUrl =
      platform === "kakao"
        ? buildKakaoShareUrl(applyUrl, shareTitle)
        : buildTwitterShareUrl(applyUrl, shareTitle)

    window.open(shareUrl, "_blank", "noopener,noreferrer")
  }

  const handleCloseRecruitment = async () => {
    if (!closeAllowed || isClosing) {
      return
    }

    setActionError(null)
    setIsClosing(true)

    const result = await closeLeaderDealRecruitment(deal.id)

    setIsClosing(false)

    if (!result.ok) {
      setActionError(result.error ?? labels.closeError)
      return
    }

    router.push(gbAppRoutes.sellerFinalize(countryCode, deal.id))
  }

  const handleCancelDeal = async () => {
    setActionError(null)
    setIsCancelling(true)

    const result = await cancelLeaderGroupDeal(deal.id)

    setIsCancelling(false)
    setCancelModalOpen(false)

    if (!result.ok) {
      setActionError(result.error ?? labels.cancelError)
      return
    }

    setDealStatus("cancelled")
    setCancelSuccess(true)
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <LocalizedClientLink href={gbAppRoutes.sellerDeal(countryCode, deal.id)}>
        <BbButton variant="secondary" size="sm">
          {labels.backToDashboard}
        </BbButton>
      </LocalizedClientLink>

      <BbSectionHeader title={labels.title} subtitle={deal.title} />

      {isCancelled || cancelSuccess ? (
        <BbAlert variant="warn">{labels.dealCancelledBanner}</BbAlert>
      ) : null}

      {actionError ? <BbAlert variant="error">{actionError}</BbAlert> : null}

      {cancelSuccess ? (
        <BbAlert variant="info">{labels.notifyParticipantsStub}</BbAlert>
      ) : null}

      <section className="flex flex-col gap-3">
        <BbSectionHeader title={labels.shareTitle} className="mb-0" />
        <BbButton
          variant="cta"
          fullWidth
          onClick={handleCopyLink}
          data-testid="recruitment-copy-apply-link"
        >
          {copied ? labels.copySuccess : labels.copyApplyLink}
        </BbButton>
        <div className="grid grid-cols-3 gap-2">
          <BbButton
            variant="secondary"
            size="sm"
            onClick={() => handleShare("kakao")}
            data-testid="recruitment-share-kakao"
          >
            {labels.shareKakao}
          </BbButton>
          <BbButton
            variant="secondary"
            size="sm"
            onClick={() => handleShare("twitter")}
            data-testid="recruitment-share-twitter"
          >
            {labels.shareTwitter}
          </BbButton>
          <BbButton
            variant="secondary"
            size="sm"
            onClick={() => handleShare("native")}
            data-testid="recruitment-share-native"
          >
            {labels.shareMore}
          </BbButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <BbSectionHeader title={labels.participantsTitle} className="mb-0" />
        {confirmedParticipations.length === 0 ? (
          <BbEmptyState title={labels.emptyParticipants} />
        ) : (
          <BbTable
            columns={[
              labels.nameColumn,
              labels.quantityColumn,
              labels.depositColumn,
            ]}
            rows={confirmedParticipations.map((participation) => [
              participation.recipient_name,
              String(participation.quantity),
              formatAmount(participation.deposit_amount),
            ])}
          />
        )}
        <Text className="text-xs text-[var(--bb-mute)]">
          {labels.participantCount.replace(
            "{count}",
            String(confirmedParticipations.length)
          )}
        </Text>
      </section>

      {!isCancelled && !cancelSuccess ? (
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <BbButton
              variant="cta"
              fullWidth
              disabled={!closeAllowed}
              isLoading={isClosing}
              onClick={handleCloseRecruitment}
              data-testid="recruitment-close-deal"
            >
              {labels.closeRecruitment}
            </BbButton>
            <BbButton
              variant="danger"
              fullWidth
              disabled={!cancelAllowed}
              onClick={() => setCancelModalOpen(true)}
              data-testid="recruitment-cancel-deal"
            >
              {labels.cancelDeal}
            </BbButton>
          </div>
          {!closeAllowed ? (
            <Text className="text-xs text-[var(--bb-mute)]">
              {labels.closeDisabledHint}
            </Text>
          ) : null}
          {!cancelAllowed ? (
            <Text className="text-xs text-[var(--bb-mute)]">
              {labels.cancelDisabledHint}
            </Text>
          ) : null}
        </section>
      ) : null}

      <SellerRecruitmentCancelModal
        open={cancelModalOpen}
        isSubmitting={isCancelling}
        onConfirm={handleCancelDeal}
        onDismiss={() => setCancelModalOpen(false)}
      />
    </div>
  )
}

export default SellerRecruitmentView
