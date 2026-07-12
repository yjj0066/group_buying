import { Suspense } from "react"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

import CurrencySelect from "./index"

type CurrencySelectSlotProps = {
  regions: HttpTypes.StoreRegion[]
}

const CurrencySelectFallback = () => (
  <div
    className={clx(
      "flex items-center justify-center min-w-[3rem] h-9 px-2 rounded-full",
      "text-ui-fg-subtle bg-ui-bg-subtle animate-pulse text-xs font-medium"
    )}
    aria-hidden="true"
  >
    ···
  </div>
)

const CurrencySelectSlot = ({ regions }: CurrencySelectSlotProps) => {
  if (!regions?.length) {
    return null
  }

  return (
    <Suspense fallback={<CurrencySelectFallback />}>
      <CurrencySelect regions={regions} />
    </Suspense>
  )
}

export default CurrencySelectSlot
