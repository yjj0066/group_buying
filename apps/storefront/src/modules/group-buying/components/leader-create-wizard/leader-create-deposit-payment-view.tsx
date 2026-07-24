"use client"



import { useEffect, useMemo, useRef, useState } from "react"

import { useParams, useRouter } from "next/navigation"



import {
  calculateLeaderDepositAmount,
  GROUP_BUYING_LEADER_DEPOSIT_AMOUNT,
  LEADER_DEPOSIT_DEADLINE_MINUTES,
} from "@lib/constants/group-buying-fees"

import { GROUP_BUYING_DEMO_PRODUCT_ID } from "@lib/constants/group-buying-demo-product"
import { DEFAULT_GROUP_BUYING_GOODS_TYPE } from "@lib/constants/group-buying-catalog"

import {
  createHostedGroupDeal,
  recordLeaderDeposit,
} from "@lib/data/account-group-deals-actions"

import { useDictionary, formatMessage } from "@i18n/provider"

import { gbAppRoutes } from "@lib/wireframe/routes"

import {

  BbAlert,

  BbButton,

  BbKeyValue,

  BbSectionHeader,

  BbTimerBanner,

  BbVirtualAccountCard,

} from "@modules/design-system"

import { Text } from "@modules/common/components/ui"

import { formatGroupDealValidationError, shouldSuggestLeaderCreateStepReview } from "@lib/util/format-group-deal-validation-error"
import { resolveMedusaErrorMessage } from "@lib/util/medusa-error"
import {
  assertDataUrlUploadSize,
  isUploadSizeRelatedError,
} from "@lib/util/upload-size-error"
import { convertToLocale } from "@lib/util/money"
import { mapAccountGroupDealToGroupDeal } from "@lib/util/map-account-group-deal"
import { cacheHostedDeal } from "@lib/data/hosted-deal-session-cache"
import {
  clearLeaderCreateWizardDraftFromAccount,
  loadLeaderCreateWizardDraftFromAccount,
} from "@lib/data/leader-create-draft-persistence"
import { createMemberOption } from "types/group-deal"



import { LeaderCreateWireframeShell } from "./leader-create-wireframe-shell"
import {
  LEADER_CREATE_WIZARD_STEP_INDEX,
  resolveLeaderCreateStepTitle,
} from "./constants"

import {

  clearLeaderCreateDraft,

  loadLeaderCreateDraft,

  saveLeaderCreateDraft,

} from "./storage"

import {

  getTotalRecruitmentAmount,

  getTotalSeatCount,

  type LeaderCreateDraft,

} from "./types"



const formatHoldTime = (secondsLeft: number) => {

  const hours = Math.floor(secondsLeft / 3600)

  const minutes = Math.floor((secondsLeft % 3600) / 60)

  const seconds = secondsLeft % 60



  if (hours > 0) {

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  }



  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

}



const createLeaderDepositVirtualAccount = (
  seed: string,
  amount: number
) => {
  const suffix = seed.replace(/\D/g, "").slice(-6).padStart(6, "0")

  return {
    bank_name: "국민은행",
    account_number: `123-456-${suffix.slice(0, 3)}-${suffix.slice(3)}`,
    account_holder: "아이돌공구(주)",
    amount,
    currency_code: "krw" as const,
  }
}

const resolveLeaderDepositAmount = (draft: LeaderCreateDraft): number => {
  const activeSeats = draft.memberSeats.filter((seat) => seat.quantity > 0)
  const totalSeats = getTotalSeatCount(activeSeats)
  const primaryPrice = activeSeats[0]?.price ?? 0

  if (!totalSeats || primaryPrice <= 0) {
    return GROUP_BUYING_LEADER_DEPOSIT_AMOUNT
  }

  return calculateLeaderDepositAmount({
    deal_price: primaryPrice,
    target_quantity: totalSeats,
  })
}



const ensureDepositExpiry = (draft: LeaderCreateDraft): LeaderCreateDraft => {
  const now = Date.now()
  const existingExpiry = draft.depositPaymentExpiresAt
    ? new Date(draft.depositPaymentExpiresAt).getTime()
    : 0

  if (existingExpiry > now) {
    return draft
  }

  const nextDraft = {
    ...draft,
    depositPaymentExpiresAt: new Date(
      now + LEADER_DEPOSIT_DEADLINE_MINUTES * 60 * 1000
    ).toISOString(),
  }

  saveLeaderCreateDraft(nextDraft)

  return nextDraft
}



const isDraftReady = (draft: LeaderCreateDraft) =>
  Boolean(
    draft.title.trim() &&
      draft.idolGroup.trim() &&
      draft.albumQuantity.trim() &&
      draft.memberSeats.some(
        (seat) => seat.quantity > 0 && seat.label.trim() && seat.price > 0
      )
  )



const buildDealTitle = (draft: LeaderCreateDraft) =>

  draft.title.trim() || "새 공동구매"



const buildGroupDealFromDraft = (
  draft: LeaderCreateDraft,
  accountDeal: import("types/account-group-deals").AccountGroupDeal
) => {
  const mapped = mapAccountGroupDealToGroupDeal(accountDeal)
  const activeSeats = draft.memberSeats.filter((seat) => seat.quantity > 0)
  const totalSeats = getTotalSeatCount(activeSeats)
  const primaryPrice = activeSeats[0]?.price ?? 0

  return {
    ...mapped,
    description: `${draft.idolGroup} · ${draft.goodsType}`,
    product_id: GROUP_BUYING_DEMO_PRODUCT_ID,
    deal_price: primaryPrice,
    original_price: primaryPrice,
    min_participants: totalSeats,
    target_quantity: totalSeats,
    total_seats: totalSeats,
    filled_seats: 0,
    current_participants: 0,
    current_quantity: 0,
    options: activeSeats.map((seat, index) =>
      createMemberOption(
        mapped.id,
        seat.id,
        seat.label,
        seat.price,
        seat.price,
        seat.quantity,
        0,
        index
      )
    ),
    metadata: {
      ...mapped.metadata,
      idol_group: draft.idolGroup,
      goods_type: draft.goodsType,
      hosted: true,
      member_seats: activeSeats.map((seat) => ({
        label: seat.label,
        price: seat.price,
        quantity: seat.quantity,
      })),
    },
  }
}



export const LeaderCreateDepositPaymentView = () => {

  const t = useDictionary()

  const w = t.gbApp.leaderCreateWizard

  const router = useRouter()

  const { countryCode } = useParams() as { countryCode: string }



  const [draft, setDraft] = useState<LeaderCreateDraft | null>(null)

  const [secondsLeft, setSecondsLeft] = useState(0)

  const [copied, setCopied] = useState(false)

  const [agreed, setAgreed] = useState(false)

  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [timerReady, setTimerReady] = useState(false)
  const expiryHandledRef = useRef(false)



  useEffect(() => {
    let cancelled = false

    const hydrateDraft = async () => {
      let loaded = loadLeaderCreateDraft()

      if (!isDraftReady(loaded)) {
        const remoteDraft = await loadLeaderCreateWizardDraftFromAccount().catch(
          () => null
        )

        if (remoteDraft && isDraftReady(remoteDraft)) {
          loaded = remoteDraft
          saveLeaderCreateDraft(remoteDraft)
        }
      }

      if (cancelled) {
        return
      }

      if (!isDraftReady(loaded)) {
        setDraft(null)
        return
      }

      setDraft(ensureDepositExpiry(loaded))
    }

    hydrateDraft()

    return () => {
      cancelled = true
    }
  }, [])



  useEffect(() => {

    if (!draft?.depositPaymentExpiresAt) {

      return

    }



    const expiresAtMs = new Date(draft.depositPaymentExpiresAt).getTime()



    const updateRemaining = () => {
      setSecondsLeft(
        Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      )
      setTimerReady(true)
    }



    updateRemaining()



    const timer = window.setInterval(updateRemaining, 1000)



    return () => window.clearInterval(timer)

  }, [draft?.depositPaymentExpiresAt])



  useEffect(() => {
    if (!timerReady || secondsLeft > 0 || !draft || expiryHandledRef.current) {
      return
    }

    if (!draft.depositPaymentExpiresAt) {
      return
    }

    expiryHandledRef.current = true
    setIsExpired(true)
  }, [secondsLeft, draft, timerReady])

  const handleResetCreate = () => {
    clearLeaderCreateDraft()
    router.push(gbAppRoutes.sellerCreateBasic(countryCode))
  }

  const handleBackToPreviousStep = () => {
    if (draft) {
      saveLeaderCreateDraft(draft)
    }

    router.push(gbAppRoutes.sellerCreateSales(countryCode))
  }



  const virtualAccount = useMemo(() => {

    if (!draft) {

      return null

    }



    const seed =

      draft.createdDealId ?? draft.title ?? draft.memberSeats[0]?.label ?? "000000"



    return createLeaderDepositVirtualAccount(
      seed,
      resolveLeaderDepositAmount(draft)
    )
  }, [draft])



  const totalSeats = useMemo(

    () => (draft ? getTotalSeatCount(draft.memberSeats) : 0),

    [draft]

  )



  const totalRecruitmentAmount = useMemo(

    () => (draft ? getTotalRecruitmentAmount(draft.memberSeats) : 0),

    [draft]

  )



  const amountLabel = useMemo(() => {

    if (!virtualAccount) {

      return "-"

    }



    return convertToLocale({

      amount: virtualAccount.amount,

      currency_code: virtualAccount.currency_code,

    })

  }, [virtualAccount])



  const handleCopy = async () => {

    if (!virtualAccount) {

      return

    }



    await navigator.clipboard.writeText(

      virtualAccount.account_number.replace(/-/g, "")

    )

    setCopied(true)

    window.setTimeout(() => setCopied(false), 2000)

  }



  const handleConfirm = async () => {
    if (!draft || isExpired || !agreed) {
      return
    }

    setIsConfirming(true)
    setConfirmError(null)

    try {
      if (draft.productImageDataUrl) {
        assertDataUrlUploadSize(draft.productImageDataUrl)
      }

      let dealId = draft.createdDealId
      let accountDeal: import("types/account-group-deals").AccountGroupDeal | null =
        null

      if (!dealId) {
        const now = new Date()
        const endsAt = draft.recruitmentDeadline
          ? new Date(`${draft.recruitmentDeadline}T23:59:00`).toISOString()
          : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const totalSeatsCount = getTotalSeatCount(draft.memberSeats)
        const activeSeats = draft.memberSeats.filter((seat) => seat.quantity > 0)
        const primaryPrice = activeSeats[0]?.price ?? 0

        const createResult = await createHostedGroupDeal({
          title: buildDealTitle(draft),
          description: `${draft.idolGroup} · ${draft.goodsType}`,
          product_id: GROUP_BUYING_DEMO_PRODUCT_ID,
          min_participants: totalSeatsCount,
          target_quantity: totalSeatsCount,
          original_price: primaryPrice,
          deal_price: primaryPrice,
          currency_code: "krw",
          starts_at: now.toISOString(),
          ends_at: endsAt,
          declared_album_quantity: Number(draft.albumQuantity) || totalSeatsCount,
          primary_seller: draft.primarySeller,
          expected_ship_date: draft.expectedShipDate || undefined,
          member_seats: activeSeats.map((seat) => ({
            label: seat.label,
            price: seat.price,
            quantity: seat.quantity,
          })),
          idol_group: draft.idolGroup,
          goods_type: draft.goodsType?.trim() || DEFAULT_GROUP_BUYING_GOODS_TYPE,
          ...(draft.productImageDataUrl
            ? {
                image_base64: draft.productImageDataUrl,
                image_filename: draft.productImageFileName ?? undefined,
              }
            : {}),
        })

        if (!createResult.ok) {
          setConfirmError(formatGroupDealValidationError(createResult.error))
          setIsConfirming(false)
          return
        }

        accountDeal = createResult.group_deal
        dealId = accountDeal.id
      }

      const depositAmount =
        accountDeal?.deposit_amount ??
        (draft ? resolveLeaderDepositAmount(draft) : GROUP_BUYING_LEADER_DEPOSIT_AMOUNT)

      const depositResult = await recordLeaderDeposit(dealId, {
        deposit_amount: depositAmount,
        deposit_payment_key: `mock-leader-deposit-${Date.now()}`,
      })

      if (!depositResult.ok) {
        setConfirmError(formatGroupDealValidationError(depositResult.error))
        setIsConfirming(false)
        return
      }

      accountDeal = depositResult.group_deal

      cacheHostedDeal(buildGroupDealFromDraft(draft, accountDeal))
      clearLeaderCreateDraft()
      await clearLeaderCreateWizardDraftFromAccount()
      router.push(gbAppRoutes.sellerDeal(countryCode, dealId))
    } catch (error) {
      const formatted = formatGroupDealValidationError(
        resolveMedusaErrorMessage(error)
      )

      setConfirmError(formatted)
      setIsConfirming(false)
    }
  }



  if (!draft) {

    return (

      <div className="flex flex-col gap-6 pb-8">

        <BbAlert variant="error">{w.depositMissingDraft}</BbAlert>

        <BbButton
          onClick={() => router.push(gbAppRoutes.sellerCreateBasic(countryCode))}
        >

          {w.back}

        </BbButton>

      </div>

    )

  }



  if (!virtualAccount) {

    return null

  }



  return (

    <LeaderCreateWireframeShell

      stepIndex={3}

      title={resolveLeaderCreateStepTitle(
        w,
        LEADER_CREATE_WIZARD_STEP_INDEX.deposit
      )}

      footer={
        isExpired ? (
          <BbButton
            variant="cta"
            onClick={handleResetCreate}
            data-testid="leader-create-deposit-reset"
          >
            {w.depositResetCta}
          </BbButton>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <BbButton
              variant="secondary"
              disabled={isConfirming}
              onClick={handleBackToPreviousStep}
              data-testid="leader-create-deposit-back"
            >
              {w.back}
            </BbButton>
            <BbButton
              variant="cta"
              isLoading={isConfirming}
              disabled={!agreed || !timerReady}
              onClick={handleConfirm}
              data-testid="leader-create-deposit-confirm"
            >
              {w.depositConfirmCta}
            </BbButton>
          </div>
        )
      }

    >

      <div className="flex flex-col gap-4">

        <BbSectionHeader

          title={w.depositPaymentTitle}

          className="mb-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#111827]"

        />



        {isExpired ? (
          <BbAlert variant="error">
            {`${w.depositTimeoutExpired}\n${w.depositExpiredCancel}`}
          </BbAlert>
        ) : timerReady ? (
          <BbTimerBanner urgent className="flex flex-col gap-1 py-3">
            <span className="font-semibold">{w.depositTimeoutWarning}</span>
            <span>
              {formatMessage(w.depositTimeoutRemaining, {
                time: formatHoldTime(secondsLeft),
              })}
            </span>
          </BbTimerBanner>
        ) : null}



        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">

          <Text className="mb-2 text-xs font-semibold text-[#6B7280]">

            모집액

          </Text>

          <BbKeyValue

            items={[

              { label: w.totalSeatsLabel, value: `${totalSeats}자리` },

              {

                label: w.totalAmountLabel,

                value: convertToLocale({

                  amount: totalRecruitmentAmount,

                  currency_code: "krw",

                }),

              },

              {

                label: "보증금",

                value: amountLabel,

              },

            ]}

          />

        </div>



        <BbVirtualAccountCard

          bankName={virtualAccount.bank_name}

          accountNumber={virtualAccount.account_number}

          holder={virtualAccount.account_holder}

          amountLabel={amountLabel}

          copyAccountLabel={t.groupBuying.depositCopyAccount}

          onCopyAccount={handleCopy}

        />



        {copied ? (

          <p

            role="status"

            className="rounded-xl bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white"

          >

            {w.depositCopied}

          </p>

        ) : null}



        <div className="rounded-xl border border-[#FBCFE8] bg-[#FDF2F8] px-4 py-3">

          <Text className="text-xs leading-relaxed text-[#9D174D]">

            {w.depositRefundNote}

          </Text>

        </div>



        {!isExpired ? (
          <label className="flex items-start gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#6B46E5]"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              data-testid="leader-create-deposit-agreement"
            />
            <span>{w.depositAgreementLabel}</span>
          </label>
        ) : null}

        {confirmError ? (
          <BbAlert variant="error">
            <p className="whitespace-pre-line">{confirmError}</p>
            {!isUploadSizeRelatedError(confirmError) &&
            shouldSuggestLeaderCreateStepReview(confirmError) ? (
              <p className="mt-2 font-normal">{w.depositValidationBackHint}</p>
            ) : null}
          </BbAlert>
        ) : null}

      </div>

    </LeaderCreateWireframeShell>

  )

}



export default LeaderCreateDepositPaymentView

