import { Text } from "@modules/common/components/ui"
import type { HttpTypes } from "@medusajs/types"

type CustomerProfileSummaryProps = {
  customer: HttpTypes.StoreCustomer
  fallbackName?: string | null
  variant?: "card" | "compact"
}

const CustomerProfileSummary = ({
  customer,
  fallbackName,
  variant = "card",
}: CustomerProfileSummaryProps) => {
  const displayName =
    customer.first_name?.trim() ||
    fallbackName?.trim() ||
    customer.email.split("@")[0]
  const initial = displayName.slice(0, 1).toUpperCase()

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 px-1 py-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink/20 to-brand-purple/20 text-sm font-black text-brand-purple"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <Text className="text-sm font-black text-[var(--bb-ink)]">
            {displayName}
          </Text>
          <Text className="mt-0.5 truncate text-xs text-[var(--bb-mute)]">
            {customer.email}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-ui-border-base bg-ui-bg-subtle/40 p-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink/25 to-brand-purple/25 text-lg font-black text-brand-purple"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-ui-fg-base">
          {displayName}
        </Text>
        <Text className="mt-1 truncate text-sm text-ui-fg-subtle">
          {customer.email}
        </Text>
      </div>
    </div>
  )
}

export default CustomerProfileSummary
