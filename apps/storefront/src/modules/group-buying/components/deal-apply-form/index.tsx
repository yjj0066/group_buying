"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { useParams, useRouter } from "next/navigation"

import {
  GROUP_BUYING_PLATFORM_FEE,
  GROUP_BUYING_SHIPPING_FEE,
  SEAT_HOLD_MINUTES,
} from "@lib/constants/group-buying-fees"
import { submitDealApplication } from "@lib/data/group-deal-participation"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { dealApplicationSummaryKey } from "@modules/group-buying/components/deal-complete-view"
import { convertToLocale } from "@lib/util/money"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
  BbTimerBanner,
} from "@modules/design-system"
import {
  formatDaumPostcodeAddress,
  type DaumPostcodeResult,
} from "@modules/group-buying/components/korean-address-search/use-daum-postcode"
import DaumPostcodeModal from "@modules/group-buying/components/korean-address-search/daum-postcode-modal"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type DealApplyFormProps = {
  deal: GroupDeal
  optionId: string
  memberLabel: string
  quantity: number
}

const formatHoldTime = (secondsLeft: number) => {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("82") && digits.length >= 10) {
    return `0${digits.slice(2)}`
  }

  return digits
}

const isValidPhone = (value: string) => {
  const digits = normalizePhone(value)
  return /^01[016789]\d{7,8}$/.test(digits)
}

const DealApplyForm = ({
  deal,
  optionId,
  memberLabel,
  quantity,
}: DealApplyFormProps) => {
  const t = useDictionary()
  const apply = t.groupBuying.applyForm
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const option = useMemo(
    () => deal.options?.find((item) => item.id === optionId),
    [deal.options, optionId]
  )

  const unitPrice = option?.deal_price ?? deal.deal_price
  const productSubtotal = unitPrice * quantity
  const totalAmount =
    productSubtotal + GROUP_BUYING_PLATFORM_FEE + GROUP_BUYING_SHIPPING_FEE

  const [secondsLeft, setSecondsLeft] = useState(SEAT_HOLD_MINUTES * 60)
  const [recipientName, setRecipientName] = useState("")
  const [phone, setPhone] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [address, setAddress] = useState("")
  const [addressDetail, setAddressDetail] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addressSearchOpen, setAddressSearchOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid = useMemo(() => {
    if (!recipientName.trim()) {
      return false
    }

    if (!isValidPhone(phone)) {
      return false
    }

    if (!postalCode.trim() || !address.trim()) {
      return false
    }

    return true
  }, [recipientName, phone, postalCode, address])

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [secondsLeft])

  useEffect(() => {
    if (secondsLeft === 0) {
      router.replace(gbAppRoutes.deal(countryCode, deal.id))
    }
  }, [secondsLeft, router, countryCode, deal.id])

  const handleAddressComplete = useCallback((data: DaumPostcodeResult) => {
    setPostalCode(data.zonecode)
    setAddress(formatDaumPostcodeAddress(data))
    setError(null)
  }, [])

  const openAddressSearch = useCallback(() => {
    setAddressSearchOpen(true)
  }, [])

  const closeAddressSearch = useCallback(() => {
    setAddressSearchOpen(false)
  }, [])

  const handleAddressFieldActivate = useCallback(
    (event: MouseEvent<HTMLInputElement>) => {
      event.preventDefault()
      openAddressSearch()
    },
    [openAddressSearch]
  )

  const handleAddressFieldKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        openAddressSearch()
      }
    },
    [openAddressSearch]
  )

  const handleSubmit = async () => {
    if (!isFormValid) {
      setError(apply.shippingRequired)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const fullAddress = [postalCode, address, addressDetail]
        .filter(Boolean)
        .join(" ")

      const participation = await submitDealApplication({
        dealId: deal.id,
        optionId,
        memberLabel,
        quantity,
        recipientName: recipientName.trim(),
        phone: normalizePhone(phone),
        address: fullAddress,
        deliveryNote: deliveryNote.trim() || undefined,
        countryCode,
      })

      if (participation.virtual_account) {
        sessionStorage.setItem(
          `gb-deposit-${participation.id}`,
          JSON.stringify(participation.virtual_account)
        )
      }

      sessionStorage.setItem(
        `gb-deposit-meta-${participation.id}`,
        JSON.stringify({
          member: memberLabel,
          quantity,
          recipientName: recipientName.trim(),
          phone: normalizePhone(phone),
        })
      )

      sessionStorage.setItem(
        dealApplicationSummaryKey(participation.id),
        JSON.stringify({
          productTitle: deal.title,
          paymentAmount: totalAmount,
          currencyCode: deal.currency_code,
          shippingAddress: fullAddress,
          recipientName: recipientName.trim(),
          member: memberLabel,
        })
      )

      router.push(
        `${gbAppRoutes.dealDeposit(countryCode, deal.id)}?participantId=${participation.id}`
      )
    } catch {
      setError(t.groupBuying.joinError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const optionLabel = option?.label ?? memberLabel

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbTimerBanner urgent={secondsLeft <= 60}>
        {apply.seatHoldBanner.replace("{time}", formatHoldTime(secondsLeft))}
      </BbTimerBanner>

      <BbCard padding="md">
        <BbSectionHeader title={apply.summaryTitle} className="mb-3" />
        <BbKeyValue
          items={[
            { label: apply.selectedOption, value: optionLabel },
            { label: apply.quantity, value: String(quantity) },
            {
              label: apply.productAmount,
              value: convertToLocale({
                amount: productSubtotal,
                currency_code: deal.currency_code,
              }),
            },
            {
              label: apply.platformFee,
              value: convertToLocale({
                amount: GROUP_BUYING_PLATFORM_FEE,
                currency_code: deal.currency_code,
              }),
            },
            {
              label: apply.shippingFee,
              value: convertToLocale({
                amount: GROUP_BUYING_SHIPPING_FEE,
                currency_code: deal.currency_code,
              }),
            },
            {
              label: apply.totalAmount,
              value: convertToLocale({
                amount: totalAmount,
                currency_code: deal.currency_code,
              }),
            },
          ]}
        />
      </BbCard>

      <BbCard padding="md">
        <BbSectionHeader title={apply.shippingTitle} className="mb-3" />
        <div className="flex flex-col gap-3">
          <input
            className="bb-input"
            placeholder={apply.recipientName}
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            autoComplete="name"
            data-testid="apply-recipient-name"
          />
          <input
            className="bb-input"
            placeholder={apply.phone}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            data-testid="apply-phone"
          />
          <div className="flex gap-2">
            <input
              className="bb-input flex-1"
              placeholder={apply.postalCode}
              value={postalCode}
              readOnly
              onMouseDown={handleAddressFieldActivate}
              onKeyDown={handleAddressFieldKeyDown}
              data-testid="apply-postal-code"
            />
            <BbButton
              variant="secondary"
              size="sm"
              type="button"
              onClick={openAddressSearch}
              data-testid="apply-address-search"
            >
              {apply.addressSearch}
            </BbButton>
          </div>
          <input
            className="bb-input cursor-pointer"
            placeholder={apply.address}
            value={address}
            readOnly
            onMouseDown={handleAddressFieldActivate}
            onKeyDown={handleAddressFieldKeyDown}
            data-testid="apply-address"
          />
          <input
            className="bb-input"
            placeholder={apply.addressDetail}
            value={addressDetail}
            onChange={(event) => setAddressDetail(event.target.value)}
            autoComplete="address-line2"
            data-testid="apply-address-detail"
          />
          <input
            className="bb-input"
            placeholder={apply.deliveryNote}
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
            data-testid="apply-delivery-note"
          />
        </div>
      </BbCard>

      <BbAlert variant="info">{apply.finalAmountNotice}</BbAlert>

      {error && <BbAlert variant="error">{error}</BbAlert>}

      <BbButton
        variant="cta"
        fullWidth
        disabled={!isFormValid}
        isLoading={isSubmitting}
        onClick={handleSubmit}
        data-testid="apply-submit"
      >
        {apply.submitButton}
      </BbButton>

      <Text className="text-center text-xs text-[var(--bb-mute)]">
        {t.groupBuying.seatHoldNotice}
      </Text>

      <DaumPostcodeModal
        open={addressSearchOpen}
        onClose={closeAddressSearch}
        onComplete={handleAddressComplete}
      />
    </div>
  )
}

export default DealApplyForm
