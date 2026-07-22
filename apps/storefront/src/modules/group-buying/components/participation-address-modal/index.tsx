"use client"

import { useEffect, useState, type FormEvent } from "react"

import { updateParticipationShippingAddress } from "@lib/data/account-group-deals-actions"
import { useDictionary } from "@i18n/provider"
import { BbAlert, BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { ParticipationShippingAddress } from "types/account-group-deals"

type ParticipationAddressModalProps = {
  participantId: string
  initialAddress: ParticipationShippingAddress
  open: boolean
  onClose: () => void
  onSaved: (address: ParticipationShippingAddress) => void
}

const ParticipationAddressModal = ({
  participantId,
  initialAddress,
  open,
  onClose,
  onSaved,
}: ParticipationAddressModalProps) => {
  const t = useDictionary()
  const labels = t.account.participations

  const [recipientName, setRecipientName] = useState(initialAddress.recipient_name)
  const [phone, setPhone] = useState(initialAddress.phone)
  const [postalCode, setPostalCode] = useState(initialAddress.postal_code)
  const [addressLine1, setAddressLine1] = useState(initialAddress.address_line_1)
  const [addressLine2, setAddressLine2] = useState(
    initialAddress.address_line_2 ?? ""
  )
  const [deliveryNote, setDeliveryNote] = useState(
    initialAddress.delivery_note ?? ""
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setRecipientName(initialAddress.recipient_name)
    setPhone(initialAddress.phone)
    setPostalCode(initialAddress.postal_code)
    setAddressLine1(initialAddress.address_line_1)
    setAddressLine2(initialAddress.address_line_2 ?? "")
    setDeliveryNote(initialAddress.delivery_note ?? "")
    setError(null)
  }, [initialAddress, open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    const nextAddress: ParticipationShippingAddress = {
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      postal_code: postalCode.trim(),
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || null,
      delivery_note: deliveryNote.trim() || null,
    }

    const result = await updateParticipationShippingAddress(
      participantId,
      nextAddress
    )

    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onSaved(nextAddress)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="participation-address-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <Text
          id="participation-address-title"
          className="text-base font-black text-[var(--bb-ink)]"
        >
          {labels.addressChangeTitle}
        </Text>

        {error && <BbAlert variant="error">{error}</BbAlert>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressRecipientLabel}
          </span>
          <input
            className="bb-input w-full"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressPhoneLabel}
          </span>
          <input
            className="bb-input w-full"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressPostalCodeLabel}
          </span>
          <input
            className="bb-input w-full"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressLine1Label}
          </span>
          <input
            className="bb-input w-full"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressLine2Label}
          </span>
          <input
            className="bb-input w-full"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[var(--bb-ink)]">
            {labels.addressNoteLabel}
          </span>
          <input
            className="bb-input w-full"
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
          />
        </label>

        <div className="flex gap-2 pt-2">
          <BbButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isSaving}
          >
            {labels.addressChangeCancel}
          </BbButton>
          <BbButton type="submit" fullWidth isLoading={isSaving}>
            {labels.addressChangeSave}
          </BbButton>
        </div>
      </form>
    </div>
  )
}

export default ParticipationAddressModal
