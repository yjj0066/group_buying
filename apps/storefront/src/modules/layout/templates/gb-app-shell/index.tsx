"use client"

import GbWebShell from "@modules/layout/templates/gb-web-shell"

type GbAppShellProps = {
  children: React.ReactNode
  headerTitle?: string
  showBack?: boolean
  backHref?: string
  hideChrome?: boolean
}

/** @deprecated Props kept for compatibility; layout uses web shell chrome. */
const GbAppShell = ({ children }: GbAppShellProps) => {
  return <GbWebShell>{children}</GbWebShell>
}

export default GbAppShell
