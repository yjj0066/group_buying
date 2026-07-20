"use client"

import { ReactNode } from "react"

import { useDictionary } from "@i18n/provider"
import LeaderAccountSidebar from "@modules/group-buying/components/leader-account-sidebar"
import { cn } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

import { LEADER_CREATE_WIZARD_STEPS } from "./constants"

type LeaderCreateDesktopShellProps = {
  stepIndex: number
  children: ReactNode
  footer?: ReactNode
}

const LeaderCreateDesktopShell = ({
  stepIndex,
  children,
  footer,
}: LeaderCreateDesktopShellProps) => {
  const t = useDictionary()
  const w = t.gbApp.leaderCreateWizard

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 pb-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <LeaderAccountSidebar />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text className="text-2xl font-bold tracking-tight text-[#111827]">
            {w.title}
          </Text>
          <Text className="text-sm text-[#6B7280]">{w.subtitle}</Text>
        </div>

        <ol className="grid grid-cols-2 gap-3 small:grid-cols-4">
          {LEADER_CREATE_WIZARD_STEPS.map((step, index) => {
            const active = index === stepIndex
            const done = index < stepIndex

            return (
              <li
                key={step}
                className={cn(
                  "rounded-xl border bg-white px-3 py-3 text-center text-xs font-semibold transition-colors",
                  active &&
                    "border-[#6B46E5] text-[#6B46E5] shadow-[0_0_0_1px_#6B46E5]",
                  done && !active && "border-[#DDD6FE] text-[#6B46E5]",
                  !active && !done && "border-[#E5E7EB] text-[#9CA3AF]"
                )}
              >
                {index + 1}. {step}
              </li>
            )
          })}
        </ol>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {children}
        </div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default LeaderCreateDesktopShell
