"use client"

import { ReactNode } from "react"

import LeaderCreateDesktopShell from "./leader-create-desktop-shell"

type LeaderCreateWireframeShellProps = {
  stepIndex: number
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export const LeaderCreateWireframeShell = ({
  stepIndex,
  title,
  children,
  footer,
}: LeaderCreateWireframeShellProps) => {
  return (
    <LeaderCreateDesktopShell stepIndex={stepIndex} footer={footer}>
      {title ? <p className="text-lg font-bold text-[#111827]">{title}</p> : null}
      {children}
    </LeaderCreateDesktopShell>
  )
}

export default LeaderCreateWireframeShell
