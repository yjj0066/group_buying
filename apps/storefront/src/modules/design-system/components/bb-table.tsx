import { ReactNode } from "react"

import { cn } from "../cn"

type BbTableProps = {
  columns: string[]
  rows: ReactNode[][]
  className?: string
}

export const BbTable = ({ columns, rows, className }: BbTableProps) => (
  <div
    className={cn(
      "overflow-hidden rounded-xl border border-[var(--bb-line)]",
      className
    )}
  >
    <div className="grid bg-[var(--bb-surface)] text-[10px] font-bold text-[var(--bb-mute)]"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column) => (
        <div key={column} className="border-r border-white px-3 py-2 last:border-r-0">
          {column}
        </div>
      ))}
    </div>
    {rows.map((row, rowIndex) => (
      <div
        key={rowIndex}
        className="grid border-t border-[var(--bb-line)] text-xs text-[var(--bb-ink)]"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {row.map((cell, cellIndex) => (
          <div
            key={cellIndex}
            className="border-r border-[var(--bb-surface)] px-3 py-2.5 last:border-r-0"
          >
            {cell}
          </div>
        ))}
      </div>
    ))}
  </div>
)

export default BbTable
