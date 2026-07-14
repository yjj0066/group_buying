import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Text } from "@modules/common/components/ui"
import ParticipationTimeline from "@modules/account/components/participation-timeline"
import ConfirmDeliveryButton from "@modules/account/components/confirm-delivery-button"
import type { AccountParticipation } from "types/account-group-deals"

type ParticipationsListProps = {
  participations: AccountParticipation[]
  labels: {
    empty: string
    quantity: string
    viewDeal: string
    tracking: string
    confirmDelivery: string
    confirmingDelivery: string
    deliveryConfirmed: string
    confirmDeliveryError: string
  }
}

const ParticipationsList = ({
  participations,
  labels,
}: ParticipationsListProps) => {
  if (!participations.length) {
    return (
      <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center">
        <Text className="text-ui-fg-subtle">{labels.empty}</Text>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-5">
      {participations.map((participation) => {
        const canConfirmDelivery =
          participation.stage === "shipping" &&
          !participation.delivery_confirmed_at &&
          participation.status === "confirmed"

        return (
        <li
          key={participation.participant_id}
          className="rounded-xl border border-ui-border-base p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <Text className="text-lg font-semibold">
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
                href={`/group-buying/${participation.group_deal.id}`}
              >
                <Button variant="secondary" size="small">
                  {labels.viewDeal}
                </Button>
              </LocalizedClientLink>
            </div>
          </div>
          <ParticipationTimeline stage={participation.stage} />
        </li>
        )
      })}
    </ul>
  )
}

export default ParticipationsList
