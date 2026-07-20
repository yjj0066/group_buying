import { Text } from "@modules/common/components/ui"
import {
  formatMyPageRoleLine,
  getIdolInterestTags,
  resolveMyPageRole,
} from "@lib/util/my-page-profile"
import type {
  GroupBuyingPreferences,
  LeaderTrustBadge,
  LeaderTrustProfile,
} from "types/account-group-deals"
import type { HttpTypes } from "@medusajs/types"

type MyPageProfileCardLabels = {
  roleLeader: string
  roleParticipant: string
  trustSummary: string
  interestIdols: string
  badgeLabels: Record<LeaderTrustBadge, string>
}

type MyPageProfileCardProps = {
  customer: HttpTypes.StoreCustomer
  preferences: GroupBuyingPreferences
  trustProfile: LeaderTrustProfile | null
  labels: MyPageProfileCardLabels
}

const MyPageProfileCard = ({
  customer,
  preferences,
  trustProfile,
  labels,
}: MyPageProfileCardProps) => {
  const nickname =
    customer.first_name?.trim() ||
    preferences.favorite_member?.trim() ||
    customer.email.split("@")[0]
  const initial = nickname.slice(0, 1).toUpperCase()
  const role = resolveMyPageRole(preferences, trustProfile)
  const roleLine = formatMyPageRoleLine({
    role,
    trustProfile,
    roleLeaderLabel: labels.roleLeader,
    roleParticipantLabel: labels.roleParticipant,
    trustSummaryLabel: labels.trustSummary,
    badgeLabels: labels.badgeLabels,
  })
  const idolTags = getIdolInterestTags(preferences)

  return (
    <section className="rounded-2xl border border-[var(--bb-line)] bg-gradient-to-br from-white to-[#faf8ff] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink/25 to-brand-purple/25 text-lg font-black text-brand-purple"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <Text className="text-base font-black text-[var(--bb-ink)]">
            {nickname}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-brand-purple">
            {roleLine}
          </Text>
        </div>
      </div>

      {idolTags.length > 0 && (
        <div className="mt-4">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-[var(--bb-mute)]">
            {labels.interestIdols}
          </Text>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {idolTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-semibold text-brand-purple"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default MyPageProfileCard
