"use client"

import { useState } from "react"

import JoinDealForm from "@modules/group-buying/components/join-deal-form"
import MemberSeatPicker, {
  type SelectedSeat,
} from "@modules/group-buying/components/member-seat-picker"
import type { GroupDeal } from "types/group-deal"

type DealJoinSectionProps = {
  deal: GroupDeal
}

const DealJoinSection = ({ deal }: DealJoinSectionProps) => {
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeat | null>(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null)

  const hasMemberOptions = (deal.options ?? []).some(
    (option) => option.option_type === "member"
  )

  return (
    <div className="flex flex-col gap-y-6">
      {hasMemberOptions && (
        <MemberSeatPicker
          deal={deal}
          selectedSeat={selectedSeat}
          onSelect={setSelectedSeat}
          holdExpiresAt={holdExpiresAt}
          onHoldStart={setHoldExpiresAt}
        />
      )}

      <JoinDealForm
        deal={deal}
        selectedSeat={selectedSeat}
        holdExpiresAt={holdExpiresAt}
        requiresSeat={hasMemberOptions}
      />
    </div>
  )
}

export default DealJoinSection
