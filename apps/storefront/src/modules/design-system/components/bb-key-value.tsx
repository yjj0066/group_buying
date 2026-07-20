import { cn } from "../cn"

type BbKeyValueProps = {
  items: Array<{ label: string; value: string; id?: string }>
  className?: string
  compact?: boolean
}

export const BbKeyValue = ({ items, className, compact }: BbKeyValueProps) => (
  <dl className={cn("flex flex-col gap-0", className)}>
    {items.map((item, index) => (
      <div
        key={item.id ?? `${index}-${item.label}`}
        className={cn(
          "flex items-center justify-between gap-4 border-b border-dotted border-[#E5E7EB] py-2 last:border-0",
          compact && "py-1.5 text-xs"
        )}
      >
        <dt className="text-xs text-[#6B7280]">{item.label}</dt>
        <dd className="text-sm font-bold text-[#111827] text-right">
          {item.value}
        </dd>
      </div>
    ))}
  </dl>
)

export default BbKeyValue
