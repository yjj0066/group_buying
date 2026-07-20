"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { listHostedDealParticipations } from "@lib/data/account-group-deals"

import { useDictionary } from "@i18n/provider"

import { loadCachedHostedDeal } from "@lib/data/hosted-deal-session-cache"

import {

  mapParticipationToHostedDealParticipant,

  type HostedDealParticipant,

} from "@lib/util/seller-deal-dashboard-data"

import { gbAppRoutes } from "@lib/wireframe/routes"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import SellerDealDashboard from "@modules/group-buying/components/seller-deal-dashboard"

import { BbAlert, BbButton } from "@modules/design-system"

import type { GroupDeal } from "types/group-deal"

type SellerDealDashboardPageContentProps = {

  dealId: string

  initialDeal: GroupDeal | null

  initialParticipants?: HostedDealParticipant[]

}

const mergeDealWithSessionCache = (
  serverDeal: GroupDeal,
  cachedDeal: GroupDeal | null
): GroupDeal => {
  if (!cachedDeal) {
    return serverDeal
  }

  const serverHasOptions = Boolean(serverDeal.options?.length)

  if (serverHasOptions) {
    return serverDeal
  }

  return {
    ...serverDeal,
    options: cachedDeal.options ?? serverDeal.options,
    metadata: {
      ...(serverDeal.metadata ?? {}),
      ...(cachedDeal.metadata ?? {}),
    },
    description: serverDeal.description ?? cachedDeal.description,
    deal_price: serverDeal.deal_price || cachedDeal.deal_price,
    original_price: serverDeal.original_price || cachedDeal.original_price,
    total_seats: serverDeal.total_seats ?? cachedDeal.total_seats,
    target_quantity: serverDeal.target_quantity || cachedDeal.target_quantity,
    min_participants: serverDeal.min_participants || cachedDeal.min_participants,
  }
}

const SellerDealDashboardPageContent = ({

  dealId,

  initialDeal,

  initialParticipants = [],

}: SellerDealDashboardPageContentProps) => {

  const t = useDictionary()

  const { countryCode } = useParams() as { countryCode: string }

  const [deal, setDeal] = useState<GroupDeal | null>(initialDeal)

  const [participants, setParticipants] =

    useState<HostedDealParticipant[]>(initialParticipants)

  const [resolved, setResolved] = useState(Boolean(initialDeal))

  useEffect(() => {

    const cachedDeal = loadCachedHostedDeal(dealId)

    if (initialDeal) {

      setDeal(mergeDealWithSessionCache(initialDeal, cachedDeal))

      setResolved(true)

      return

    }

    setDeal(cachedDeal)

    setResolved(true)

  }, [dealId, initialDeal])

  useEffect(() => {

    if (!deal) {

      return

    }

    let cancelled = false

    const loadParticipants = async () => {

      const rows = await listHostedDealParticipations(dealId)

      if (cancelled) {

        return

      }

      setParticipants(

        rows.map((row) => mapParticipationToHostedDealParticipant(row, deal))

      )

    }

    void loadParticipants()

    return () => {

      cancelled = true

    }

  }, [deal, dealId])

  if (!resolved) {

    return null

  }

  if (!deal) {

    return (

      <div className="flex flex-col gap-4 py-8">

        <BbAlert variant="error">

          {t.gbApp.leaderCreateWizard.depositMissingDraft}

        </BbAlert>

        <LocalizedClientLink href={gbAppRoutes.myHosted(countryCode)}>

          <BbButton variant="secondary">{t.account.hostedDeals.title}</BbButton>

        </LocalizedClientLink>

      </div>

    )

  }

  return <SellerDealDashboard deal={deal} participants={participants} />

}

export default SellerDealDashboardPageContent
