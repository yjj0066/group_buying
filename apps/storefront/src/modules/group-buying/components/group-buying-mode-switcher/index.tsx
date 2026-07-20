"use client"

import { useDictionary } from "@i18n/provider"
import {
  modeFromToggleIndex,
  modeToggleIndex,
  type GroupBuyingMode,
} from "@lib/group-buying/mode"
import { BbToggle, cn } from "@modules/design-system"

import { useGroupBuyingMode } from "../group-buying-mode-provider"

type GroupBuyingModeSwitcherProps = {
  className?: string
  compact?: boolean
}

const GroupBuyingModeSwitcher = ({
  className,
  compact = false,
}: GroupBuyingModeSwitcherProps) => {
  const t = useDictionary()
  const { mode, setMode, isPending } = useGroupBuyingMode()

  const handleChange = (index: 0 | 1) => {
    const next = modeFromToggleIndex(index)

    if (next !== mode) {
      void setMode(next)
    }
  }

  return (
    <div
      className={cn(
        compact ? "scale-90 origin-right" : "flex justify-center",
        className
      )}
      aria-label={t.gbApp.modeSwitcherAria}
    >
      <BbToggle
        options={[t.gbApp.modeParticipant, t.gbApp.modeLeader]}
        value={modeToggleIndex(mode)}
        onChange={handleChange}
        className={cn(isPending && "pointer-events-none opacity-70")}
      />
    </div>
  )
}

export default GroupBuyingModeSwitcher
