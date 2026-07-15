import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ConfirmDeliveryButton from "@modules/account/components/confirm-delivery-button"
import ParticipationTimeline from "@modules/account/components/participation-timeline"
import LeaderTrustPanel from "@modules/group-buying/components/leader-trust-panel"
import PurchaseReceiptPanel from "@modules/group-buying/components/purchase-receipt-panel"
import { Button, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { GroupDeal } from "types/group-deal"

type Props = {
  params: Promise<{ participantId: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.participations.detailTitle,
  }
}

export default async function ParticipationDetailPage(props: Props) {
  const params = await props.params
  const [dictionary, participations] = await Promise.all([
    getServerDictionary(),
    listMyParticipations(),
  ])

  const participation = participations.find(
    (item) => item.participant_id === params.participantId
  )

  if (!participation) {
    notFound()
  }

  const t = dictionary.account.participations
  const dealForTrust = {
    id: participation.group_deal.id,
    title: participation.group_deal.title,
    description: null,
    product_id: "",
    variant_id: null,
    min_participants: participation.group_deal.target_quantity,
    current_participants: participation.group_deal.current_participants,
    target_quantity: participation.group_deal.target_quantity,
    current_quantity: participation.group_deal.current_participants,
    max_quantity: null,
    original_price: 0,
    deal_price: 0,
    currency_code: participation.group_deal.currency_code,
    status: participation.group_deal.status,
    starts_at: participation.created_at,
    ends_at: participation.group_deal.ends_at ?? participation.created_at,
    metadata: null,
    leader_customer_id: null,
    deposit_status: participation.group_deal.deposit_status,
    deposit_amount: participation.group_deal.deposit_amount,
    purchase_receipt_status: participation.group_deal.purchase_receipt_status,
    created_at: participation.created_at,
    updated_at: participation.created_at,
  } satisfies GroupDeal

  const canConfirmDelivery =
    participation.stage === "shipping" &&
    !participation.delivery_confirmed_at &&
    participation.status === "confirmed"

  return (
    <div className="flex flex-col gap-y-6">
      <LocalizedClientLink href="/account/group-deals/participations">
        <Button variant="secondary" size="small">
          {t.backToList}
        </Button>
      </LocalizedClientLink>

      <div>
        <h1 className="text-2xl-semi">{participation.group_deal.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">
          {t.quantity.replace("{count}", String(participation.quantity))}
        </Text>
      </div>

      <LeaderTrustPanel deal={dealForTrust} />

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="text-sm font-semibold">{t.progressTitle}</Text>
        <div className="mt-4">
          <ParticipationTimeline stage={participation.stage} />
        </div>
      </section>

      <PurchaseReceiptPanel deal={dealForTrust} />

      {participation.tracking_number && (
        <section className="rounded-xl border border-ui-border-base p-5">
          <Text className="text-sm font-semibold">{t.trackingTitle}</Text>
          <Text className="mt-2 text-sm text-ui-fg-subtle">
            {t.tracking.replace("{number}", participation.tracking_number)}
          </Text>
        </section>
      )}

      {participation.group_deal.deposit_amount != null && (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
          <Text className="text-sm font-semibold text-emerald-900">
            {t.escrowTitle}
          </Text>
          <Text className="mt-2 text-sm text-emerald-800">
            {convertToLocale({
              amount: participation.group_deal.deposit_amount,
              currency_code: participation.group_deal.currency_code,
            })}
          </Text>
        </section>
      )}

      <Text className="text-xs text-ui-fg-muted">{t.autoDeliveryConfirmHint}</Text>

      {canConfirmDelivery && (
        <ConfirmDeliveryButton
          participantId={participation.participant_id}
          labels={{
            confirm: t.confirmDelivery,
            confirming: t.confirmingDelivery,
            confirmed: t.deliveryConfirmed,
            error: t.confirmDeliveryError,
          }}
        />
      )}
    </div>
  )
}
