"use client"

import { ReactNode } from "react"

import LeaderAccountSidebar from "@modules/group-buying/components/leader-account-sidebar"
import { Text } from "@modules/common/components/ui"

type LeaderWireframeShellProps = {
  screenId?: string
  title: string
  children: ReactNode
  footer?: ReactNode
}

export const LeaderWireframeShell = ({
  screenId,
  title,
  children,
  footer,
}: LeaderWireframeShellProps) => {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <LeaderAccountSidebar />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Text className="text-2xl font-bold tracking-tight text-[#111827]">
            {title}
          </Text>
          {screenId ? (
            <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 text-xs font-semibold text-[#6B46E5]">
              {screenId}
            </span>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-5">{children}</div>
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

export default LeaderWireframeShell
