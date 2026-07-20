"use client"

import { cn } from "../cn"

type BbToggleProps = {
  options: [string, string]
  value: 0 | 1
  onChange: (index: 0 | 1) => void
  className?: string
}

export const BbToggle = ({ options, value, onChange, className }: BbToggleProps) => (
  <div
    className={cn(
      "inline-flex rounded-xl bg-[var(--bb-surface)] p-1",
      className
    )}
    role="group"
  >
    {options.map((label, index) => {
      const active = value === index

      return (
        <button
          key={label}
          type="button"
          onClick={() => onChange(index as 0 | 1)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
            active
              ? "bg-white text-[var(--bb-ink)] shadow-sm"
              : "text-[var(--bb-mute)] hover:text-[var(--bb-ink)]"
          )}
        >
          {label}
        </button>
      )
    })}
  </div>
)

export default BbToggle
