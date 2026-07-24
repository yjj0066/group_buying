"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { confirmParticipantDelivery } from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { buildTrackingUrl } from "@lib/util/tracking-link"
import {
  canChangeParticipationShippingAddress,
  resolveParticipationProgressStage,
  shouldShowParticipationTracking,
} from "@lib/util/participation-progress-stage"
import {
  canCancelParticipation,
  canShowPurchaseConfirm,
} from "@lib/util/participation-status"
import ParticipationAddressModal from "@modules/group-buying/components/participation-address-modal"
import ParticipationCancelButton from "@modules/group-buying/components/participation-cancel-button"
import ParticipationProgressStepper from "@modules/group-buying/components/participation-progress-stepper"
import PurchaseConfirmButton from "@modules/group-buying/components/purchase-confirm-button"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbKeyValue,
  BbSectionHeader,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import type {
  AccountParticipation,
  ParticipationShippingAddress,
} from "types/account-group-deals"

const DEFAULT_ADDRESS: ParticipationShippingAddress = {
  recipient_name: "",
  phone: "",
  postal_code: "",
  address_line_1: "",
  address_line_2: "",
  delivery_note: "",
}

type ParticipationDetailViewProps = {
  participation: AccountParticipation
}

const formatAddress = (address: ParticipationShippingAddress) => {
  const lines = [
    `[${address.postal_code}] ${address.address_line_1}`,
    address.address_line_2,
    address.delivery_note,
  ].filter(Boolean)

  return lines.join("\n")
}

const ParticipationDetailView = ({
  participation: initialParticipation,
}: ParticipationDetailViewProps) => {
  const t = useDictionary()
  const { countryCode } = useParams() as { countryCode: string }
  const labels = t.account.participations
  const stageLabels = t.account.groupBuying.stages

  const [participation, setParticipation] = useState(initialParticipation)
  const [shippingAddress, setShippingAddress] = useState<ParticipationShippingAddress>(
    participation.shipping_address ?? DEFAULT_ADDRESS
  )
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressBlockedMessage, setAddressBlockedMessage] = useState<string | null>(
    null
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const deal = participation.group_deal
  const memberLabel = participation.member_label ?? labels.memberFallback
  const progressStage = resolveParticipationProgressStage(participation)
  const canChangeAddress = canChangeParticipationShippingAddress(progressStage)
  const showTracking = shouldShowParticipationTracking(
    progressStage,
    participation.tracking_number
  )
  const showPurchaseConfirm = canShowPurchaseConfirm(participation)
  const showCancelParticipation = canCancelParticipation(participation)

  const purchaseConfirmLabels = {
    button: labels.confirmPurchase,
    dialogTitle: labels.confirmPurchaseTitle,
    dialogMessage: labels.confirmPurchaseMessage,
    dialogConfirm: labels.confirmPurchaseConfirm,
    dialogCancel: labels.confirmPurchaseCancel,
  }

  const cancelParticipationLabels = {
    button: labels.cancelParticipation,
    dialogTitle: labels.cancelParticipationTitle,
    dialogMessage: labels.cancelParticipationMessage,
    dialogConfirm: labels.cancelParticipationConfirm,
    dialogCancel: labels.cancelParticipationDismiss,
    errorMessage: labels.cancelParticipationError,
  }

  const trackingUrl = useMemo(() => {
    if (!participation.tracking_number) {
      return null
    }

    return buildTrackingUrl(
      participation.carrier,
      participation.tracking_number
    )
  }, [participation.carrier, participation.tracking_number])

  const handleAddressButtonClick = () => {
    if (!canChangeAddress) {
      setAddressBlockedMessage(labels.changeAddressDisabledMessage)
      return
    }

    setAddressBlockedMessage(null)
    setAddressModalOpen(true)
  }

  const handleConfirmDelivery = async () => {
    setIsConfirming(true)
    setConfirmError(null)

    try {
      const response = await confirmParticipantDelivery(
        participation.participant_id
      )

      if (!response.ok) {
        setConfirmError(response.error || labels.confirmDeliveryError)
        return
      }

      setParticipation(response.participation)
    } catch {
      setConfirmError(labels.confirmDeliveryError)
    } finally {
      setIsConfirming(false)
    }
  }

  const inquiryHref = `${gbAppRoutes.mySupportInquiry(countryCode)}?participantId=${participation.participant_id}&dealId=${deal.id}`

  return (
    <div className="flex flex-col gap-6 pb-8">
      <LocalizedClientLink
        href={gbAppRoutes.participations(countryCode)}
        className="text-sm font-semibold text-brand-purple"
      >
        {labels.backToList}
      </LocalizedClientLink>

      <BbCard padding="md">
        <Text className="text-lg font-bold text-[var(--bb-ink)]">{deal.title}</Text>
        <Text className="mt-2 text-sm text-[var(--bb-mute)]">
          {labels.memberLabel.replace("{member}", memberLabel)} ·{" "}
          {labels.quantity.replace("{count}", String(participation.quantity))}
        </Text>
        <Text className="mt-3 inline-flex rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
          {stageLabels[participation.stage] ?? participation.stage}
        </Text>
      </BbCard>

      <ParticipationProgressStepper stage={progressStage} />

      {showCancelParticipation && (
        <ParticipationCancelButton
          participation={participation}
          countryCode={countryCode}
          labels={cancelParticipationLabels}
        />
      )}

      <BbCard padding="md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <BbSectionHeader title={labels.shippingAddressTitle} className="mb-0" />
          {canChangeAddress ? (
            <BbButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddressButtonClick}
            >
              {labels.changeAddressButton}
            </BbButton>
          ) : null}
        </div>

        {addressBlockedMessage && (
          <BbAlert variant="error" className="mb-3">
            {addressBlockedMessage}
          </BbAlert>
        )}

        <BbKeyValue
          items={[
            {
              label: labels.addressRecipientLabel,
              value: shippingAddress.recipient_name || "-",
            },
            {
              label: labels.addressPhoneLabel,
              value: shippingAddress.phone || "-",
            },
            {
              label: labels.shippingAddressTitle,
              value: shippingAddress.address_line_1
                ? formatAddress(shippingAddress)
                : "-",
            },
          ]}
        />
      </BbCard>

      {showTracking && (
        <BbCard padding="md">
          <BbSectionHeader title={labels.trackingTitle} className="mb-3" />
          <BbKeyValue
            items={[
              {
                label: labels.trackingCarrierLabel,
                value: participation.carrier ?? "-",
              },
              {
                label: labels.trackingNumberLabel,
                value: participation.tracking_number ?? "-",
              },
            ]}
          />
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-4 block">
              <BbButton variant="secondary" fullWidth>
                {labels.trackingExternalLink}
              </BbButton>
            </a>
          )}
        </BbCard>
      )}

      {confirmError && <BbAlert variant="error">{confirmError}</BbAlert>}

      {participation.stage === "shipping" &&
        !participation.delivery_confirmed_at && (
          <BbButton
            variant="cta"
            fullWidth
            isLoading={isConfirming}
            onClick={handleConfirmDelivery}
          >
            {labels.confirmDelivery}
          </BbButton>
        )}

      {participation.delivery_confirmed_at && (
        <BbCard padding="md">
          <Text className="text-sm font-semibold text-emerald-700">
            {labels.deliveryConfirmed}
          </Text>
        </BbCard>
      )}

      {deal.status === "settled" || deal.settled_at ? (
        <BbCard padding="md">
          <BbSectionHeader title={labels.escrowTitle} className="mb-2" />
          <Text className="text-sm text-[var(--bb-ink)]">
            {labels.settlementCompletedMessage}
          </Text>
        </BbCard>
      ) : deal.settlement_submitted_at ? (
        <BbAlert variant="info">{labels.settlementPendingMessage}</BbAlert>
      ) : null}

      {showPurchaseConfirm && (
        <PurchaseConfirmButton
          participation={participation}
          countryCode={countryCode}
          labels={purchaseConfirmLabels}
        />
      )}

      <BbAlert variant="info">{labels.autoDeliveryConfirmHint}</BbAlert>

      <LocalizedClientLink href={inquiryHref}>
        <BbButton variant="secondary" fullWidth>
          {labels.inquiryButton}
        </BbButton>
      </LocalizedClientLink>

      <Text className="text-center text-xs text-[var(--bb-mute)]">
        {labels.inquiryDescription}
      </Text>

      <ParticipationAddressModal
        participantId={participation.participant_id}
        initialAddress={shippingAddress}
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={(address) => {
          setShippingAddress(address)
          setParticipation((current) => ({
            ...current,
            shipping_address: address,
          }))
        }}
      />
    </div>
  )
}

export default ParticipationDetailView
