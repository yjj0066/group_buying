"use client"

import { hasFullSetSelection } from "@lib/util/idol-product"
import { useDictionary } from "@i18n/provider"
import { clx } from "@modules/common/components/ui"

type BonusBenefitCardProps = {
  selectedOptions: Record<string, string | undefined>
}

const BonusBenefitCard = ({ selectedOptions }: BonusBenefitCardProps) => {
  const t = useDictionary()
  const isFullSet = hasFullSetSelection(selectedOptions)

  return (
    <div className="flex flex-col gap-2">
      <div
        className={clx(
          "relative overflow-hidden rounded-2xl border px-4 py-3",
          "border-rose-200/80 bg-gradient-to-r from-rose-50 via-pink-50 to-violet-50",
          "shadow-sm animate-pulse [animation-duration:3s]"
        )}
      >
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-rose-200/40 blur-xl" />
        <p className="relative text-sm font-bold text-rose-700">
          {t.idol.bonus.preDepositTitle}
        </p>
        <p className="relative mt-1 text-xs text-rose-600/80">
          {t.idol.bonus.preDepositDescription}
        </p>
      </div>

      {isFullSet && (
        <div
          className={clx(
            "rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-fuchsia-50",
            "px-4 py-3 shadow-sm transition-all duration-300"
          )}
        >
          <p className="text-sm font-bold text-violet-700">
            {t.idol.bonus.fullSetTitle}
          </p>
          <p className="mt-1 text-xs text-violet-600/80">
            {t.idol.bonus.fullSetDescription}
          </p>
        </div>
      )}
    </div>
  )
}

export default BonusBenefitCard
