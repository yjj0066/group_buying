"use client"

import { ReactNode } from "react"

import { BbBadge } from "./bb-badge"
import { BbCard } from "./bb-card"
import { cn } from "../cn"

type BbTrustPanelProps = {
  title: string
  score?: number
  maxScore?: number
  tierLabel?: string
  description: ReactNode
  badges?: Array<{ label: string; variant?: "deposit" | "trust" | "success" }>
  footerItems?: string[]
  firstTime?: boolean
  className?: string
}

export const BbTrustPanel = ({
  title,
  score,
  maxScore = 100,
  tierLabel,
  description,
  badges = [],
  footerItems = [],
  firstTime,
  className,
}: BbTrustPanelProps) => {
  const gaugePercent =
    score != null && !firstTime ? (score / maxScore) * 100 : 0

  return (
    <BbCard tone="trust" className={cn("shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
            {title}
          </p>

          {!firstTime && score != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-black text-[#6B46E5]">
                {score.toFixed(0)}
              </span>
              {tierLabel && (
                <BbBadge variant="success" size="md">
                  {tierLabel}
                </BbBadge>
              )}
            </div>
          )}

          <div className="mt-2 text-sm leading-relaxed text-[#4B5563]">
            {description}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <BbBadge
              key={badge.label}
              variant={badge.variant ?? "deposit"}
              size="md"
            >
              {badge.label}
            </BbBadge>
          ))}
        </div>
      </div>

      {!firstTime && score != null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#6B46E5] transition-all duration-500"
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      )}

      {footerItems.length > 0 && (
        <ul className="mt-4 grid gap-1.5 border-t border-[#E5E7EB] pt-3 text-xs text-[#6B7280] small:grid-cols-2">
          {footerItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </BbCard>
  )
}

export default BbTrustPanel
