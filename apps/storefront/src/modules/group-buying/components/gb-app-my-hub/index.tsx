"use client"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import MyPageMenuList from "@modules/group-buying/components/my-page-menu-list"
import MyPageProfileCard from "@modules/group-buying/components/my-page-profile-card"
import type {
  GroupBuyingPreferences,
  LeaderTrustProfile,
} from "types/account-group-deals"
import type { HttpTypes } from "@medusajs/types"

type GbAppMyHubProps = {
  customer: HttpTypes.StoreCustomer
  preferences: GroupBuyingPreferences
  trustProfile: LeaderTrustProfile | null
  countryCode: string
}

const GbAppMyHub = ({
  customer,
  preferences,
  trustProfile,
  countryCode,
}: GbAppMyHubProps) => {
  const t = useDictionary()
  const gb = t.gbApp
  const menu = gb.myMenu

  const toRelativePath = (href: string) => href.replace(`/${countryCode}`, "")

  const menuItems = [
    { href: toRelativePath(gbAppRoutes.myAccount(countryCode)), label: menu.bankAccount },
    { href: toRelativePath(gbAppRoutes.myHosted(countryCode)), label: menu.hostedDeals },
    {
      href: toRelativePath(gbAppRoutes.myParticipations(countryCode)),
      label: menu.participations,
    },
    {
      href: toRelativePath(gbAppRoutes.mySettlements(countryCode)),
      label: menu.settlements,
    },
    { href: toRelativePath(gbAppRoutes.myTrust(countryCode)), label: menu.trustReviews },
    { href: toRelativePath(gbAppRoutes.myProfile(countryCode)), label: menu.profile },
    {
      href: toRelativePath(gbAppRoutes.myNotifications(countryCode)),
      label: menu.notifications,
    },
    { href: toRelativePath(gbAppRoutes.mySupport(countryCode)), label: menu.support },
  ]

  return (
    <div className="flex flex-col gap-5 pb-8">
      <MyPageProfileCard
        customer={customer}
        preferences={preferences}
        trustProfile={trustProfile}
        labels={{
          roleLeader: gb.modeLeader,
          roleParticipant: gb.modeParticipant,
          trustSummary: gb.myProfile.trustSummary,
          interestIdols: gb.myProfile.interestIdols,
          badgeLabels: t.account.trustReviews.badgeLabels,
        }}
      />

      <MyPageMenuList items={menuItems} />
    </div>
  )
}

export default GbAppMyHub
