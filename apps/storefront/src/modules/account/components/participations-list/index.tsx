"use client"

import { useMemo, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ConfirmDeliveryButton from "@modules/account/components/confirm-delivery-button"
import ParticipationTimeline from "@modules/account/components/participation-timeline"
import { Button, Text } from "@modules/common/components/ui"
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
  quantity: string
  viewDeal: string
  viewDetail: string
  tracking: string
  confirmDelivery: string
  confirmingDelivery: string
  deliveryConfirmed: string
  confirmDeliveryError: string
}

type ParticipationsListProps = {
  participations: AccountParticipation[]
  labels: ParticipationsListLabels
}

type ParticipationTab = "active" | "completed" | "cancelled"

const ParticipationsList = ({
  participations,
  labels,
}: ParticipationsListProps) => {
  const [tab, setTab] = useState<ParticipationTab>("active")

  const grouped = useMemo(() => {
    const active: AccountParticipation[] = []
    const completed: AccountParticipation[] = []
    const cancelled: AccountParticipation[] = []

    for (const item of participations) {
      const bucket = resolveParticipationTab(item)

      if (bucket === "completed") {
        completed.push(item)
      } else if (bucket === "cancelled") {
        cancelled.push(item)
      } else {
        active.push(item)
      }
    }

    return { active, completed, cancelled }
  }, [participations])

  const currentItems = grouped[tab]

  const emptyMessage =
    tab === "active"
      ? labels.emptyActive
      : tab === "completed"
        ? labels.emptyCompleted
        : labels.emptyCancelled

  if (!participations.length) {
    return (
      <div className="rounded-xl border border-dashed border-ui-border-base p-10 text-center">
        <Text className="text-ui-fg-subtle">{labels.empty}</Text>
        <LocalizedClientLink href="/group-buying">
          <Button variant="secondary" className="mt-4">
            {labels.emptyActiveCta}
          </Button>
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-wrap gap-2 border-b border-ui-border-base pb-4">
        {(
          [
            ["active", labels.tabActive, grouped.active.length],
            ["completed", labels.tabCompleted, grouped.completed.length],
            ["cancelled", labels.tabCancelled, grouped.cancelled.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-brand-pink text-white"
                : "bg-ui-bg-subtle text-ui-fg-subtle hover:text-ui-fg-base"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {currentItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ui-border-base p-10 text-center">
          <Text className="text-ui-fg-subtle">{emptyMessage}</Text>
          {tab === "active" && (
            <LocalizedClientLink href="/group-buying">
              <Button variant="secondary" className="mt-4">
                {labels.emptyActiveCta}
              </Button>
            </LocalizedClientLink>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-y-4">
          {currentItems.map((participation) => {
            const canConfirmDelivery =
              participation.stage === "shipping" &&
              !participation.delivery_confirmed_at &&
              participation.status === "confirmed"

            return (
              <li
                key={participation.participant_id}
                className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Text className="text-base font-semibold text-ui-fg-base">
                      {participation.group_deal.title}
                    </Text>
                    <Text className="mt-1 text-sm text-ui-fg-subtle">
                      {labels.quantity.replace(
                        "{count}",
                        String(participation.quantity)
                      )}
                    </Text>
                    {participation.tracking_number && (
                      <Text className="mt-1 text-xs text-ui-fg-subtle">
                        {labels.tracking.replace(
                          "{number}",
                          participation.tracking_number
                        )}
                      </Text>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canConfirmDelivery && (
                      <ConfirmDeliveryButton
                        participantId={participation.participant_id}
                        labels={{
                          confirm: labels.confirmDelivery,
                          confirming: labels.confirmingDelivery,
                          confirmed: labels.deliveryConfirmed,
                          error: labels.confirmDeliveryError,
                        }}
                      />
                    )}
                    <LocalizedClientLink
                      href={`/account/group-deals/participations/${participation.participant_id}`}
                    >
                      <Button variant="secondary" size="small">
                        {labels.viewDetail}
                      </Button>
                    </LocalizedClientLink>
                    <LocalizedClientLink
                      href={`/group-buying/${participation.group_deal.id}`}
                    >
                      <Button variant="secondary" size="small">
                        {labels.viewDeal}
                      </Button>
                    </LocalizedClientLink>
                  </div>
                </div>

                <div className="mt-4">
                  <ParticipationTimeline stage={participation.stage} />
                </div>

                <Text className="mt-3 text-xs text-ui-fg-muted">
                  {labels.autoDeliveryConfirmHint}
                </Text>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ParticipationsList
