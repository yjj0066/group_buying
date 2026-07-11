import { Suspense } from "react"

import { GlobeEurope } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import LanguageSwitcher from "./index"

type LanguageSwitcherSlotProps = {
  currentLocale?: string | null
}

const LanguageSwitcherFallback = () => (
  <div
    className={clx(
      "flex items-center justify-center w-9 h-9 rounded-full",
      "text-ui-fg-subtle bg-ui-bg-subtle animate-pulse"
    )}
    aria-hidden="true"
  >
    <GlobeEurope className="w-5 h-5 opacity-50" />
  </div>
)

const LanguageSwitcherSlot = ({
  currentLocale = null,
}: LanguageSwitcherSlotProps) => {
  return (
    <Suspense fallback={<LanguageSwitcherFallback />}>
      <LanguageSwitcher currentLocale={currentLocale} />
    </Suspense>
  )
}

export default LanguageSwitcherSlot
