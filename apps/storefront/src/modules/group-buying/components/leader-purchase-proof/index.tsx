"use client"

import { useDictionary } from "@i18n/provider"
import type { GroupDeal } from "types/group-deal"

import LeaderWireframeShell from "../leader-wireframe-shell"
import LeaderPurchaseProofForm from "./leader-purchase-proof-form"

type LeaderPurchaseProofViewProps = {
  deal: GroupDeal
}

const LeaderPurchaseProofView = ({ deal }: LeaderPurchaseProofViewProps) => {
  const t = useDictionary()
  const labels = t.gbApp.leaderPurchaseProof

  return (
    <LeaderWireframeShell screenId="PURC" title={labels.title}>
      <LeaderPurchaseProofForm deal={deal} />
    </LeaderWireframeShell>
  )
}

export default LeaderPurchaseProofView
