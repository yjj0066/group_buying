"use client"

import { BbButton } from "@modules/design-system"
import { useDictionary } from "@i18n/provider"
import { cn } from "@modules/design-system/cn"

type SearchEmptyResultsProps = {
  message?: string
  onWaitlist: () => void
  onReset: () => void
  showReset?: boolean
  className?: string
}

const SearchEmptyResults = ({
  message,
  onWaitlist,
  onReset,
  showReset = true,
  className,
}: SearchEmptyResultsProps) => {
  const t = useDictionary()

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-[#F5F3FF] px-4 py-16">
        <p className="text-center text-sm font-medium text-[#6B7280]">
          {message ?? t.groupBuying.emptyFiltered}
        </p>
      </div>

      <BbButton variant="cta" onClick={onWaitlist}>
        {t.groupBuying.emptyFilteredCta}
      </BbButton>

      {showReset && (
        <BbButton variant="secondary" onClick={onReset}>
          {t.groupBuying.resetFilters}
        </BbButton>
      )}
    </div>
  )
}

export default SearchEmptyResults
