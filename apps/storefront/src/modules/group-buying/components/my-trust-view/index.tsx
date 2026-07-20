"use client"

import TrustProfilePanel from "@modules/account/components/trust-profile-panel"
import { BbAlert } from "@modules/design-system"
import type { LeaderTrustProfile } from "types/account-group-deals"

type MyTrustViewLabels = {
  title: string
  description: string
  scoreLabel: string
  badgeLabels: Record<LeaderTrustProfile["badge"], string>
  breakdown: {
    completedDeals: string
    averageRating: string
    reviewCount: string
    onTimeRate: string
    disputeCount: string
    depositForfeitureCount: string
  }
  reviewsTitle: string
  reviewsEmpty: string
  ratingDistribution: string
  reportReview: string
  reporting: string
  reportSuccess: string
  reportError: string
  reportedBadge: string
}

type MyTrustViewProps = {
  profile: LeaderTrustProfile
  labels: MyTrustViewLabels
}

const MyTrustView = ({ profile, labels }: MyTrustViewProps) => (
  <div className="flex flex-col gap-4">
    <TrustProfilePanel profile={profile} labels={labels} />
    <BbAlert variant="info">총대는 후기를 삭제할 수 없음</BbAlert>
  </div>
)

export default MyTrustView
