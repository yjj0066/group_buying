import { cn } from "../cn"

type BbKpiGridProps = {
  items: Array<{ label: string; value: string }>
  className?: string
  columns?: 2 | 3 | 4
}

export const BbKpiGrid = ({
  items,
  className,
  columns = 4,
}: BbKpiGridProps) => (
  <div
    className={cn(
      "grid gap-3",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-2 small:grid-cols-4",
      className
    )}
  >
    {items.map((item) => (
      <div
        key={item.label}
        className="rounded-xl border border-[var(--bb-line)] bg-[var(--bb-surface)] px-3 py-4 text-center"
      >
        <p className="text-lg font-black text-[var(--bb-ink)]">{item.value}</p>
        <p className="mt-1 text-[10px] font-medium text-[var(--bb-mute)]">
          {item.label}
        </p>
      </div>
    ))}
  </div>
)

export default BbKpiGrid
