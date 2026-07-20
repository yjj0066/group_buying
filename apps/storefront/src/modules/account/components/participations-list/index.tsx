"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { confirmParticipantDelivery } from "@lib/data/account-group-deals"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  canShowPurchaseConfirm,
  resolveParticipationCardStatusLabel,
} from "@lib/util/participation-status"
import PurchaseConfirmButton from "@modules/group-buying/components/purchase-confirm-button"
import {
  BbAlert,
  BbBadge,
  BbButton,
  BbCard,
  BbTabs,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import type { AccountParticipation } from "types/account-group-deals"
import { resolveParticipationTab } from "types/account-group-deals"

type ParticipationsListLabels = {
  tabActive: string
  tabCompleted: string
  tabCancelled: string
  empty: string
  emptyActive: string
  emptyActiveCta: string
  emptyCompleted: string
  emptyCancelled: string
  autoDeliveryConfirmHint: string
  deliveryConfirmNeededAlert: string
  quantity: string
  viewDeal: string
  viewDetail: string
  memberLabel: string
  memberFallback: string
  statusCancelled: string
  statusRefunded: string
  tracking: string
  confirmDelivery: string
  confirmingDelivery: string
  deliveryConfirmed: string
  confirmDeliveryError: string
  confirmPurchase: string
  confirmPurchaseTitle: string
  confirmPurchaseMessage: string
  confirmPurchaseConfirm: string
  confirmPurchaseCancel: string
  progressStages?: Record<string, string>
}

type ParticipationsListProps = {
  participations: AccountParticipation[]
  labels: ParticipationsListLabels
  stageLabels?: Record<string, string>
}

const isActiveParticipation = (participation: AccountParticipation) =>
  resolveParticipationTab(participation) === "active"

const isCompletedParticipation = (participation: AccountParticipation) =>
  resolveParticipationTab(participation) === "completed"

const isCancelledParticipation = (participation: AccountParticipation) =>
  resolveParticipationTab(participation) === "cancelled"

const resolveStatusBadgeVariant = (
  participation: AccountParticipation
): "success" | "danger" | "purple" => {
  const tab = resolveParticipationTab(participation)

  if (tab === "cancelled") {
    return "danger"
  }

  if (tab === "completed") {
    return "success"
  }

  return "purple"
}

const ParticipationsList = ({
  participations,
  labels,
  stageLabels = {},
}: ParticipationsListProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "cancelled"
  >("active")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const activeItems = useMemo(
    () => participations.filter(isActiveParticipation),
    [participations]
  )
  const completedItems = useMemo(
    () => participations.filter(isCompletedParticipation),
    [participations]
  )
  const cancelledItems = useMemo(
    () => participations.filter(isCancelledParticipation),
    [participations]
  )

  const needsDeliveryConfirm = activeItems.some(
    (item) => item.stage === "shipping" && !item.delivery_confirmed_at
  )

  const visibleItems =
    activeTab === "active"
      ? activeItems
      : activeTab === "completed"
        ? completedItems
        : cancelledItems

  const handleConfirmDelivery = async (participantId: string) => {
    setConfirmingId(participantId)
    setConfirmError(null)

    try {
      await confirmParticipantDelivery(participantId)
      router.refresh()
    } catch {
      setConfirmError(labels.confirmDeliveryError)
    } finally {
      setConfirmingId(null)
    }
  }

  const purchaseConfirmLabels = {
    button: labels.confirmPurchase,
    dialogTitle: labels.confirmPurchaseTitle,
    dialogMessage: labels.confirmPurchaseMessage,
    dialogConfirm: labels.confirmPurchaseConfirm,
    dialogCancel: labels.confirmPurchaseCancel,
  }

  const cardStatusLabels = {
    progressStages: labels.progressStages ?? {},
    stageLabels,
    statusCancelled: labels.statusCancelled,
    statusRefunded: labels.statusRefunded,
  }

  return (
    <div className="flex flex-col gap-4">
      <BbTabs
        activeId={activeTab}
        onChange={(id) =>
          setActiveTab(id as "active" | "completed" | "cancelled")
        }
        items={[
          {
            id: "active",
            label: labels.tabActive,
            count: activeItems.length,
          },
          {
            id: "completed",
            label: labels.tabCompleted,
            count: completedItems.length,
          },
          {
            id: "cancelled",
            label: labels.tabCancelled,
            count: cancelledItems.length,
          },
        ]}
      />

      {needsDeliveryConfirm && activeTab === "active" && (
        <BbAlert variant="warn">{labels.deliveryConfirmNeededAlert}</BbAlert>
      )}

      {confirmError && <BbAlert variant="error">{confirmError}</BbAlert>}

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--bb-line)] px-4 py-8 text-center text-sm text-[var(--bb-mute)]">
          {activeTab === "active"
            ? labels.emptyActive
            : activeTab === "completed"
              ? labels.emptyCompleted
              : labels.emptyCancelled}
          {activeTab === "active" && (
            <>
              {" → "}
              <LocalizedClientLink
                href={gbAppRoutes.search(countryCode)}
                className="font-bold text-brand-purple underline"
              >
                [{labels.emptyActiveCta}]
              </LocalizedClientLink>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleItems.map((participation, index) => {
            const deal = participation.group_deal
            const memberLabel =
              participation.member_label ?? labels.memberFallback
            const statusLabel = resolveParticipationCardStatusLabel(
              participation,
              cardStatusLabels
            )
            const highlighted =
              activeTab === "active" &&
              participation.stage === "shipping" &&
              !participation.delivery_confirmed_at
            const showPurchaseConfirm = canShowPurchaseConfirm(participation)

            return (
              <LocalizedClientLink
                key={participation.participant_id}
                href={gbAppRoutes.participationDetail(
                  countryCode,
                  participation.participant_id
                )}
              >
                <BbCard
                  padding="md"
                  className={
                    highlighted || showPurchaseConfirm
                      ? "border-[#FCA5A5] bg-[#FEF2F2] transition-colors hover:border-[#F87171]"
                      : "transition-colors hover:border-[#D1D5DB]"
                  }
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                    <div className="min-w-0 flex-1">
                      <Text className="line-clamp-2 text-sm font-bold text-[#111827]">
                        {deal.title}
                      </Text>
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {labels.memberLabel.replace("{member}", memberLabel)}
                      </Text>
                      {activeTab === "active" && (
                        <Text className="mt-0.5 text-[10px] text-[#9CA3AF]">
                          {labels.quantity.replace(
                            "{count}",
                            String(participation.quantity)
                          )}
                        </Text>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <BbBadge variant={resolveStatusBadgeVariant(participation)}>
                        {statusLabel}
                      </BbBadge>
                      <span className="text-[#6B46E5]">›</span>
                    </div>
                  </div>

                  {showPurchaseConfirm && (
                    <PurchaseConfirmButton
                      participation={participation}
                      countryCode={countryCode}
                      className="mt-3"
                      labels={purchaseConfirmLabels}
                    />
                  )}

                  {highlighted && index === 0 && !showPurchaseConfirm && (
                    <BbButton
                      className="mt-3"
                      fullWidth
                      isLoading={confirmingId === participation.participant_id}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        void handleConfirmDelivery(participation.participant_id)
                      }}
                    >
                      {confirmingId === participation.participant_id
                        ? labels.confirmingDelivery
                        : labels.confirmDelivery}
                    </BbButton>
                  )}
                </BbCard>
              </LocalizedClientLink>
            )
          })}
        </div>
      )}

      <Text className="text-xs text-[var(--bb-mute)]">
        {labels.autoDeliveryConfirmHint}
      </Text>
    </div>
  )
}

export default ParticipationsList
