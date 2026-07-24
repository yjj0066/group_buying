"use client"

import Image from "next/image"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { convertToLocale } from "@lib/util/money"
import {
  assertDocumentUploadSize,
  readFileAsDataUrl,
} from "@lib/util/file-to-data-url"
import { formatGroupDealValidationError } from "@lib/util/format-group-deal-validation-error"
import {
  loadLeaderCreateWizardDraftFromAccount,
  saveLeaderCreateWizardDraftToAccount,
} from "@lib/data/leader-create-draft-persistence"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

import {
  LEADER_CREATE_WIZARD_STEP_INDEX,
  resolveLeaderCreateStepTitle,
} from "./constants"
import { LeaderCreateWireframeShell } from "./leader-create-wireframe-shell"
import {
  loadLeaderCreateDraft,
  saveLeaderCreateDraft,
  seedLeaderCreateMockDraft,
} from "./storage"
import {
  createMemberSeat,
  getTotalRecruitmentAmount,
  getTotalSeatCount,
  hasLeaderCreateDraftContent,
  type LeaderCreateDraft,
  type LeaderCreateMemberSeat,
} from "./types"

type LeaderCreateWireframeStepProps = {
  stepIndex: number
  backHref?: string
  nextHref: string
  isLastFormStep?: boolean
}

const SeatQuantityButton = ({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) => (
  <button
    type="button"
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-lg font-bold text-[#6B7280] transition-colors hover:border-[#6B46E5]/30 hover:text-[#6B46E5] disabled:cursor-not-allowed disabled:opacity-40"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    {label}
  </button>
)

export const LeaderCreateWireframeStep = ({
  stepIndex,
  backHref,
  nextHref,
  isLastFormStep = false,
}: LeaderCreateWireframeStepProps) => {
  const t = useDictionary()
  const w = t.gbApp.leaderCreateWizard
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [draft, setDraft] = useState<LeaderCreateDraft>(() => loadLeaderCreateDraft())
  const [error, setError] = useState<string | null>(null)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadLeaderCreateWizardDraftFromAccount()
      .then((remoteDraft) => {
        if (cancelled || !remoteDraft || !hasLeaderCreateDraftContent(remoteDraft)) {
          return
        }

        const localDraft = loadLeaderCreateDraft()

        if (!hasLeaderCreateDraftContent(localDraft)) {
          setDraft(remoteDraft)
          saveLeaderCreateDraft(remoteDraft)
        }
      })
      .catch(() => {
        // Keep sessionStorage draft when account sync is unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      saveLeaderCreateDraft(draft)
    } catch (error) {
      setPhotoUploadError(
        error instanceof Error
          ? formatGroupDealValidationError(error.message)
          : "사진 저장에 실패했습니다."
      )
    }

    const timer = window.setTimeout(() => {
      saveLeaderCreateWizardDraftToAccount(draft).catch(() => {
        // Session draft remains available locally.
      })
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [draft])

  const patch = (partial: Partial<LeaderCreateDraft>) => {
    setDraft((current) => ({ ...current, ...partial }))
  }

  const totalSeats = useMemo(
    () => getTotalSeatCount(draft.memberSeats),
    [draft.memberSeats]
  )

  const totalAmount = useMemo(
    () => getTotalRecruitmentAmount(draft.memberSeats),
    [draft.memberSeats]
  )

  const recommendedAlbumQuantity = String(totalSeats || 5)

  const updateMemberSeat = (
    seatId: string,
    updater: (seat: LeaderCreateMemberSeat) => LeaderCreateMemberSeat
  ) => {
    patch({
      memberSeats: draft.memberSeats.map((seat) =>
        seat.id === seatId ? updater(seat) : seat
      ),
    })
  }

  const validateStep = () => {
    if (stepIndex === LEADER_CREATE_WIZARD_STEP_INDEX.basic) {
      if (!draft.idolGroup.trim() || !draft.title.trim()) {
        return false
      }

      if (draft.recruitmentDeadline) {
        const deadline = new Date(`${draft.recruitmentDeadline}T23:59:00`)

        if (
          Number.isNaN(deadline.getTime()) ||
          deadline.getTime() <= Date.now()
        ) {
          return false
        }
      }

      return true
    }

    if (stepIndex === LEADER_CREATE_WIZARD_STEP_INDEX.product) {
      const activeSeats = draft.memberSeats.filter((seat) => seat.quantity > 0)

      return (
        activeSeats.length > 0 &&
        activeSeats.every(
          (seat) => seat.label.trim().length > 0 && seat.price > 0
        )
      )
    }

    if (stepIndex === LEADER_CREATE_WIZARD_STEP_INDEX.sales) {
      return Boolean(draft.albumQuantity.trim())
    }

    return true
  }

  const handleNext = () => {
    if (!validateStep()) {
      setError(w.requiredFieldsError)
      return
    }

    setError(null)
    saveLeaderCreateDraft(draft)

    if (isLastFormStep) {
      const nextDraft = {
        ...draft,
        depositPaymentExpiresAt: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(),
        createdDealId: undefined,
      }
      saveLeaderCreateDraft(nextDraft)
    }

    router.push(nextHref)
  }

  const handleLoadMockData = () => {
    const mockDraft = seedLeaderCreateMockDraft()
    setDraft(mockDraft)
    setError(null)
  }

  const addMemberSeat = () => {
    patch({
      memberSeats: [...draft.memberSeats, createMemberSeat("", 0, 1)],
    })
  }

  const removeMemberSeat = (seatId: string) => {
    if (draft.memberSeats.length <= 1) {
      return
    }

    patch({
      memberSeats: draft.memberSeats.filter((seat) => seat.id !== seatId),
    })
  }

  const handleProductPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("이미지 파일만 업로드할 수 있습니다.")
      return
    }

    setPhotoUploadError(null)
    setIsPhotoUploading(true)

    try {
      assertDocumentUploadSize(file)
      const dataUrl = await readFileAsDataUrl(file)

      patch({
        productImageDataUrl: dataUrl,
        productImageFileName: file.name,
      })
    } catch (uploadError) {
      setPhotoUploadError(
        uploadError instanceof Error
          ? formatGroupDealValidationError(uploadError.message)
          : "사진 업로드에 실패했습니다."
      )
    } finally {
      setIsPhotoUploading(false)
    }
  }

  const renderBasicStep = () => (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-[#6B7280]">
        {w.idolGroupLabel}
        <input
          className="bb-input w-full"
          placeholder={w.idolGroupPlaceholder}
          value={draft.idolGroup}
          onChange={(event) => patch({ idolGroup: event.target.value })}
          data-testid="leader-create-idol-group"
        />
      </label>

      <input
        className="bb-input w-full"
        placeholder={w.titlePlaceholder}
        value={draft.title}
        onChange={(event) => patch({ title: event.target.value })}
        data-testid="leader-create-title"
      />

      <label className="relative flex min-h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-sm text-[#9CA3AF]">
        {draft.productImageDataUrl ? (
          <>
            <Image
              src={draft.productImageDataUrl}
              alt={draft.productImageFileName ?? w.photoUploadLabel}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized
            />
            <span className="relative z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {draft.productImageFileName ?? w.photoUploadLabel}
            </span>
          </>
        ) : (
          <span>{isPhotoUploading ? "업로드 중..." : w.photoUploadLabel}</span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={isPhotoUploading}
          onChange={handleProductPhotoChange}
          data-testid="leader-create-product-photo"
        />
      </label>

      {photoUploadError && <BbAlert variant="warn">{photoUploadError}</BbAlert>}

      <input
        className="bb-input w-full"
        placeholder={w.primarySellerPlaceholder}
        value={draft.primarySeller}
        onChange={(event) => patch({ primarySeller: event.target.value })}
        data-testid="leader-create-primary-seller"
      />

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <Text className="text-xs leading-relaxed text-[#6B7280]">
          {w.immutableInfo}
        </Text>
      </div>

      <label className="flex flex-col gap-1 text-xs text-[#6B7280]">
        {w.recruitmentDeadlineLabel}
        <input
          className="bb-input w-full"
          type="date"
          value={draft.recruitmentDeadline}
          onChange={(event) =>
            patch({ recruitmentDeadline: event.target.value })
          }
          data-testid="leader-create-recruitment-deadline"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-[#6B7280]">
        {w.expectedShipDateLabel}
        <input
          className="bb-input w-full"
          type="date"
          value={draft.expectedShipDate}
          onChange={(event) => patch({ expectedShipDate: event.target.value })}
          data-testid="leader-create-expected-ship-date"
        />
      </label>

      <input
        className="bb-input w-full"
        inputMode="numeric"
        placeholder={w.expectedShippingFeePlaceholder}
        value={draft.expectedShippingFee}
        onChange={(event) =>
          patch({ expectedShippingFee: event.target.value })
        }
        data-testid="leader-create-shipping-fee"
      />

      {process.env.NODE_ENV === "development" ? (
        <BbButton
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={handleLoadMockData}
          data-testid="leader-create-load-mock"
        >
          {w.loadMockData}
        </BbButton>
      ) : null}
    </div>
  )

  const renderSeatsStep = () => (
    <div className="flex flex-col gap-3">
      <Text className="text-xs text-[#6B7280]">{w.memberSeatsDescription}</Text>

      {draft.memberSeats.map((seat) => (
        <div
          key={seat.id}
          className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[#6B7280]">
              {w.memberNameLabel}
              <input
                className="bb-input w-full"
                placeholder={w.memberNamePlaceholder}
                value={seat.label}
                onChange={(event) =>
                  updateMemberSeat(seat.id, (current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                data-testid={`leader-create-member-name-${seat.id}`}
              />
            </label>

            <label className="flex w-28 shrink-0 flex-col gap-1 text-xs text-[#6B7280]">
              {w.memberPriceLabel}
              <input
                className="bb-input w-full"
                inputMode="numeric"
                placeholder={w.memberPricePlaceholder}
                value={seat.price > 0 ? String(seat.price) : ""}
                onChange={(event) => {
                  const nextPrice = Number(event.target.value.replace(/\D/g, ""))

                  updateMemberSeat(seat.id, (current) => ({
                    ...current,
                    price: Number.isFinite(nextPrice) ? nextPrice : 0,
                  }))
                }}
                data-testid={`leader-create-member-price-${seat.id}`}
              />
            </label>

            {draft.memberSeats.length > 1 ? (
              <BbButton
                type="button"
                variant="secondary"
                size="sm"
                className="mt-5 shrink-0"
                onClick={() => removeMemberSeat(seat.id)}
              >
                {w.removeMemberSeat}
              </BbButton>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#111827]">
              {w.memberQuantityLabel}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <SeatQuantityButton
                label="-"
                disabled={seat.quantity <= 0}
                onClick={() =>
                  updateMemberSeat(seat.id, (current) => ({
                    ...current,
                    quantity: Math.max(0, current.quantity - 1),
                  }))
                }
              />
              <span className="w-6 text-center text-sm font-bold text-[#111827]">
                {seat.quantity}
              </span>
              <SeatQuantityButton
                label="+"
                onClick={() =>
                  updateMemberSeat(seat.id, (current) => ({
                    ...current,
                    quantity: current.quantity + 1,
                  }))
                }
              />
            </div>
          </div>
        </div>
      ))}

      <BbButton
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={addMemberSeat}
        data-testid="leader-create-add-member"
      >
        {w.addMemberSeat}
      </BbButton>

      <BbKeyValue
        items={[
          { label: w.totalSeatsLabel, value: String(totalSeats) },
          {
            label: w.totalAmountLabel,
            value: convertToLocale({
              amount: totalAmount,
              currency_code: "krw",
            }),
          },
        ]}
      />
    </div>
  )

  const renderAlbumStep = () => (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          className="bb-input w-full pr-28"
          inputMode="numeric"
          value={draft.albumQuantity}
          onChange={(event) => patch({ albumQuantity: event.target.value })}
          data-testid="leader-create-album-quantity"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-[#9CA3AF]">
          {w.albumQuantityHint.replace("{count}", recommendedAlbumQuantity)}
        </span>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <Text className="text-xs leading-relaxed text-[#6B7280]">
          {w.albumVerificationInfo}
        </Text>
      </div>
    </div>
  )

  const stepContent =
    stepIndex === LEADER_CREATE_WIZARD_STEP_INDEX.basic
      ? renderBasicStep()
      : stepIndex === LEADER_CREATE_WIZARD_STEP_INDEX.product
        ? renderSeatsStep()
        : renderAlbumStep()

  return (
    <LeaderCreateWireframeShell
      stepIndex={stepIndex}
      title={resolveLeaderCreateStepTitle(w, stepIndex)}
      footer={
        <div className="flex flex-col gap-3">
          {error ? <BbAlert variant="error">{error}</BbAlert> : null}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {backHref ? (
              <BbButton
                variant="secondary"
                onClick={() => router.push(backHref)}
                data-testid={`leader-create-step-${stepIndex}-back`}
              >
                {w.back}
              </BbButton>
            ) : null}
            <BbButton
              variant="cta"
              onClick={handleNext}
              data-testid={`leader-create-step-${stepIndex}-next`}
            >
              {isLastFormStep ? w.nextToDeposit : w.next}
            </BbButton>
          </div>
        </div>
      }
    >
      {stepContent}
    </LeaderCreateWireframeShell>
  )
}

export const LeaderCreateBasicStep = () => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <LeaderCreateWireframeStep
      stepIndex={LEADER_CREATE_WIZARD_STEP_INDEX.basic}
      nextHref={gbAppRoutes.sellerCreateProduct(countryCode)}
    />
  )
}

export const LeaderCreateProductStep = () => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <LeaderCreateWireframeStep
      stepIndex={LEADER_CREATE_WIZARD_STEP_INDEX.product}
      backHref={gbAppRoutes.sellerCreateBasic(countryCode)}
      nextHref={gbAppRoutes.sellerCreateSales(countryCode)}
    />
  )
}

export const LeaderCreateSalesStep = () => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <LeaderCreateWireframeStep
      stepIndex={LEADER_CREATE_WIZARD_STEP_INDEX.sales}
      backHref={gbAppRoutes.sellerCreateProduct(countryCode)}
      nextHref={gbAppRoutes.sellerCreateDeposit(countryCode)}
      isLastFormStep
    />
  )
}

export default LeaderCreateBasicStep
