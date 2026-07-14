import {
  Badge,
  Button,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

import {
  downloadGroupDealPackingSlip,
  uploadReceiptFile,
  useUpdateGroupDealTracking,
  useUploadGroupDealReceipt,
} from "../../../../hooks/use-group-deals"
import {
  DEPOSIT_STATUS_LABELS,
  getDepositBadgeColor,
  getReceiptBadgeColor,
  isParticipantPaid,
  RECEIPT_STATUS_LABELS,
  type AdminGroupDeal,
} from "../../../../lib/group-deal"
import { GroupDealReceiptStatus } from "../../../../../types/group-buying"

type TrackingDraft = {
  tracking_number: string
  carrier: string
}

type LeaderManagementPanelProps = {
  deal: AdminGroupDeal
}

const LeaderManagementPanel = ({ deal }: LeaderManagementPanelProps) => {
  const { mutateAsync: uploadReceipt, isPending: isUploadingReceipt } =
    useUploadGroupDealReceipt(deal.id)
  const { mutateAsync: saveTracking, isPending: isSavingTracking } =
    useUpdateGroupDealTracking(deal.id)

  const [trackingDrafts, setTrackingDrafts] = useState<
    Record<string, TrackingDraft>
  >({})

  const participants = deal.participants ?? []

  useEffect(() => {
    const nextDrafts: Record<string, TrackingDraft> = {}

    for (const participant of participants) {
      nextDrafts[participant.id] = {
        tracking_number: participant.tracking_number ?? "",
        carrier: participant.carrier ?? "",
      }
    }

    setTrackingDrafts(nextDrafts)
  }, [participants])

  const stats = useMemo(() => {
    const paidCount = participants.filter((participant) =>
      isParticipantPaid(participant.status)
    ).length
    const addressCount = participants.filter(
      (participant) => participant.has_shipping_address
    ).length
    const trackingCount = participants.filter(
      (participant) => participant.tracking_number
    ).length

    return {
      paidCount,
      addressCount,
      trackingCount,
      total: participants.length,
    }
  }, [participants])

  const handleReceiptUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const imageBase64 = await uploadReceiptFile(file)

      await uploadReceipt({
        image_base64: imageBase64,
        filename: file.name,
      })

      toast.success("Receipt uploaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload receipt"
      )
    } finally {
      event.target.value = ""
    }
  }

  const handleVerifyReceipt = async (status: GroupDealReceiptStatus) => {
    try {
      await uploadReceipt({ status })
      toast.success(
        status === GroupDealReceiptStatus.VERIFIED
          ? "Receipt verified"
          : "Receipt rejected"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update receipt status"
      )
    }
  }

  const handleDownloadPackingSlip = async () => {
    try {
      await downloadGroupDealPackingSlip(deal.id, "csv")
      toast.success("Packing slip downloaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download packing slip"
      )
    }
  }

  const handleSaveTracking = async () => {
    const entries = Object.entries(trackingDrafts)
      .filter(([, draft]) => draft.tracking_number.trim())
      .map(([participantId, draft]) => ({
        participant_id: participantId,
        tracking_number: draft.tracking_number.trim(),
        carrier: draft.carrier.trim() || null,
      }))

    if (!entries.length) {
      toast.error("Enter at least one tracking number")
      return
    }

    try {
      await saveTracking({ entries })
      toast.success("Tracking numbers saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save tracking numbers"
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="small" color={getDepositBadgeColor(deal.deposit_status)}>
          {DEPOSIT_STATUS_LABELS[deal.deposit_status] ?? deal.deposit_status}
        </Badge>
        <Badge
          size="small"
          color={getReceiptBadgeColor(deal.purchase_receipt_status)}
        >
          {RECEIPT_STATUS_LABELS[deal.purchase_receipt_status] ??
            deal.purchase_receipt_status}
        </Badge>
        {deal.deposit_amount != null && (
          <Text size="small" className="text-ui-fg-subtle">
            Deposit: {deal.deposit_amount.toLocaleString()} {deal.currency_code}
          </Text>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <Text size="small" className="text-ui-fg-subtle">
            Payment Complete
          </Text>
          <Heading level="h2">
            {stats.paidCount} / {stats.total}
          </Heading>
        </div>
        <div className="rounded-lg border p-4">
          <Text size="small" className="text-ui-fg-subtle">
            Address Provided
          </Text>
          <Heading level="h2">
            {stats.addressCount} / {stats.total}
          </Heading>
        </div>
        <div className="rounded-lg border p-4">
          <Text size="small" className="text-ui-fg-subtle">
            Tracking Entered
          </Text>
          <Heading level="h2">
            {stats.trackingCount} / {stats.total}
          </Heading>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <Heading level="h2" className="mb-3">
          1st Purchase Receipt
        </Heading>
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="receipt-upload" className="cursor-pointer">
            <Button variant="secondary" asChild disabled={isUploadingReceipt}>
              <span>Upload Receipt Image</span>
            </Button>
          </Label>
          <input
            id="receipt-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptUpload}
          />
          <Button
            variant="secondary"
            onClick={() => handleVerifyReceipt(GroupDealReceiptStatus.VERIFIED)}
            isLoading={isUploadingReceipt}
          >
            Verify Receipt
          </Button>
          <Button
            variant="danger"
            onClick={() => handleVerifyReceipt(GroupDealReceiptStatus.REJECTED)}
            isLoading={isUploadingReceipt}
          >
            Reject Receipt
          </Button>
          <Button variant="secondary" onClick={handleDownloadPackingSlip}>
            Download Packing Slip (CSV)
          </Button>
        </div>
        {deal.purchase_receipt_url && (
          <div className="mt-4">
            <Text size="small" className="text-ui-fg-subtle mb-2">
              Current receipt
            </Text>
            <a
              href={deal.purchase_receipt_url}
              target="_blank"
              rel="noreferrer"
              className="text-ui-fg-interactive underline"
            >
              {deal.purchase_receipt_url}
            </a>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Heading level="h2">Order Fulfillment Dashboard</Heading>
          <Button
            onClick={handleSaveTracking}
            isLoading={isSavingTracking}
            disabled={!participants.length}
          >
            Save Tracking Numbers
          </Button>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Payment</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>Qty</Table.HeaderCell>
              <Table.HeaderCell>Carrier</Table.HeaderCell>
              <Table.HeaderCell>Tracking Number</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {participants.length === 0 && (
              <Table.Row>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle">No participants yet.</Text>
                </Table.Cell>
              </Table.Row>
            )}

            {participants.map((participant) => {
              const draft = trackingDrafts[participant.id] ?? {
                tracking_number: "",
                carrier: "",
              }

              return (
                <Table.Row key={participant.id}>
                  <Table.Cell>{participant.email}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="small"
                      color={
                        isParticipantPaid(participant.status)
                          ? "green"
                          : "orange"
                      }
                    >
                      {isParticipantPaid(participant.status)
                        ? "Paid"
                        : participant.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="small"
                      color={
                        participant.has_shipping_address ? "green" : "grey"
                      }
                    >
                      {participant.has_shipping_address
                        ? "Complete"
                        : "Missing"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{participant.quantity}</Table.Cell>
                  <Table.Cell>
                    <Input
                      value={draft.carrier}
                      placeholder="CJ / Korea Post"
                      onChange={(event) =>
                        setTrackingDrafts((current) => ({
                          ...current,
                          [participant.id]: {
                            ...draft,
                            carrier: event.target.value,
                          },
                        }))
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      value={draft.tracking_number}
                      placeholder="Tracking number"
                      onChange={(event) =>
                        setTrackingDrafts((current) => ({
                          ...current,
                          [participant.id]: {
                            ...draft,
                            tracking_number: event.target.value,
                          },
                        }))
                      }
                    />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

export default LeaderManagementPanel
