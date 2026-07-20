"use client"

import { cn } from "../cn"

type BbTabsProps = {
  items: Array<{ id: string; label: string; count?: number }>
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export const BbTabs = ({ items, activeId, onChange, className }: BbTabsProps) => (
  <div
    className={cn(
      "flex gap-1 border-b border-[#E5E7EB]",
      className
    )}
    role="tablist"
  >
    {items.map((item) => {
      const active = item.id === activeId

      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium transition-colors",
            active
              ? "text-[#6B46E5] font-bold"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          {item.label}
          {item.count != null && (
            <span className="ml-1 text-[#9CA3AF]">{item.count}</span>
          )}
          {active && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#6B46E5]" />
          )}
        </button>
      )
    })}
  </div>
)

export default BbTabs
