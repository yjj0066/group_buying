"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbKeyValue,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

import { loadLeaderDistributionDraft } from "../leader-purchase-proof/distribution-storage"
import {
  buildInitialAllocationMap,
  clampAssignedQuantity,
  computeAllocationRemaining,
  countPartialRefundParticipants,
  sumAssignedQuantities,
} from "./allocation-utils"
import QuantityStepper from "./quantity-stepper"
import {
  loadLeaderManualAllocationDraft,
  saveLeaderManualAllocationDraft,
} from "./storage"

type LeaderManualDistributionViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const LeaderManualDistributionView = ({
  deal,
  participations,
}: LeaderManualDistributionViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderManualDistribution
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const distributionDraft = useMemo(
    () => loadLeaderDistributionDraft(deal.id),
    [deal.id]
  )

  const actualPurchaseQty = distributionDraft?.purchasedQuantity ?? null
  const targetQty = distributionDraft?.targetQuantity ?? null
  const shortageAmount = distributionDraft?.shortage ?? 0

  const [allocationMap, setAllocationMap] = useState<Record<string, number>>(() => {
    const saved = loadLeaderManualAllocationDraft(deal.id)

    if (saved?.allocations.length) {
      return saved.allocations.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.participant_id] = entry.assigned_quantity
        return acc
      }, {})
    }

    return buildInitialAllocationMap(participations)
  })

  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    if (!distributionDraft || distributionDraft.method !== "manual") {
      return
    }

    if (actualPurchaseQty == null || actualPurchaseQty <= 0) {
      router.replace(gbAppRoutes.sellerPurchaseProof(countryCode, deal.id))
      return
    }

    setAccessChecked(true)
  }, [
    actualPurchaseQty,
    countryCode,
    deal.id,
    distributionDraft,
    router,
  ])

  const assignedTotal = useMemo(
    () => sumAssignedQuantities(allocationMap),
    [allocationMap]
  )

  const remainingQty = useMemo(() => {
    if (actualPurchaseQty == null) {
      return 0
    }

    return computeAllocationRemaining(actualPurchaseQty, allocationMap)
  }, [actualPurchaseQty, allocationMap])

  const isBalanced = remainingQty === 0
  const partialRefundCount = useMemo(
    () => countPartialRefundParticipants(participations, allocationMap),
    [participations, allocationMap]
  )

  const handleAssignedChange = (
    participantId: string,
    orderedQuantity: number,
    nextValue: number
  ) => {
    setAllocationMap((current) => ({
      ...current,
      [participantId]: clampAssignedQuantity(nextValue, orderedQuantity),
    }))
  }

  const handleConfirm = () => {
    if (actualPurchaseQty == null || targetQty == null || !isBalanced) {
      return
    }

    const confirmMessage =
      partialRefundCount > 0
        ? labels.confirmPartialRefundMessage.replace(
            "{count}",
            String(partialRefundCount)
          )
        : labels.confirmBalancedMessage

    if (!window.confirm(confirmMessage)) {
      return
    }

    saveLeaderManualAllocationDraft(deal.id, {
      actualPurchaseQty,
      targetQty,
      shortageAmount,
      allocations: participations.map((participation) => ({
        participant_id: participation.participant_id,
        assigned_quantity:
          allocationMap[participation.participant_id] ?? 0,
        ordered_quantity: participation.quantity,
      })),
      confirmedAt: new Date().toISOString(),
    })

    router.push(gbAppRoutes.sellerShipping(countryCode, deal.id))
  }

  if (!distributionDraft || distributionDraft.method !== "manual") {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <BbSectionHeader title={labels.title} subtitle={deal.title} />
        <BbAlert variant="warning">{labels.missingSelectionMessage}</BbAlert>
        <BbButton
          fullWidth
          onClick={() =>
            router.push(gbAppRoutes.sellerQuantityVerification(countryCode, deal.id))
          }
        >
          {labels.backToVerificationButton}
        </BbButton>
      </div>
    )
  }

  if (!accessChecked) {
    return null
  }

  if (participations.length === 0) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <BbAlert variant="warning">{labels.emptyParticipantsMessage}</BbAlert>
        <BbButton
          fullWidth
          onClick={() =>
            router.push(gbAppRoutes.sellerQuantityVerification(countryCode, deal.id))
          }
        >
          {labels.backToVerificationButton}
        </BbButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbSectionHeader
        title={labels.title}
        subtitle={`${labels.stepLabel} · ${deal.title}`}
      />

      <BbAlert variant="info">{labels.description}</BbAlert>

      <BbKeyValue
        items={[
          {
            label: labels.actualPurchaseQtyLabel,
            value: labels.quantityUnit.replace(
              "{count}",
              String(actualPurchaseQty ?? 0)
            ),
          },
          {
            label: labels.assignedTotalLabel,
            value: labels.quantityUnit.replace("{count}", String(assignedTotal)),
          },
          {
            label: labels.remainingQtyLabel,
            value: labels.quantityUnit.replace("{count}", String(remainingQty)),
          },
        ]}
      />

      {!isBalanced && (
        <BbAlert variant="error">
          {remainingQty > 0
            ? labels.remainingOverMessage.replace(
                "{count}",
                String(remainingQty)
              )
            : labels.remainingUnderMessage.replace(
                "{count}",
                String(Math.abs(remainingQty))
              )}
        </BbAlert>
      )}

      {isBalanced && partialRefundCount > 0 && (
        <BbAlert variant="info">
          {labels.partialRefundHint.replace(
            "{count}",
            String(partialRefundCount)
          )}
        </BbAlert>
      )}

      <BbSectionHeader title={labels.participantListTitle} className="mb-0" />

      <BbTable
        columns={[
          labels.participantNameColumn,
          labels.orderedQtyColumn,
          labels.assignedQtyColumn,
        ]}
        rows={participations.map((participation) => {
          const assignedQty =
            allocationMap[participation.participant_id] ?? 0

          return [
            participation.recipient_name,
            labels.quantityUnit.replace(
              "{count}",
              String(participation.quantity)
            ),
            <QuantityStepper
              key={participation.participant_id}
              value={assignedQty}
              max={participation.quantity}
              decreaseAriaLabel={labels.decreaseAssignedAria}
              increaseAriaLabel={labels.increaseAssignedAria}
              inputAriaLabel={labels.assignedInputAria.replace(
                "{name}",
                participation.recipient_name
              )}
              onChange={(nextValue) =>
                handleAssignedChange(
                  participation.participant_id,
                  participation.quantity,
                  nextValue
                )
              }
            />,
          ]
        })}
      />

      <BbButton
        variant="cta"
        fullWidth
        disabled={!isBalanced}
        onClick={handleConfirm}
        data-testid="leader-manual-distribution-confirm"
      >
        {labels.submitButton}
      </BbButton>
    </div>
  )
}

export default LeaderManualDistributionView
