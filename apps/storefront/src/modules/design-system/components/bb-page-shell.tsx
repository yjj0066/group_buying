import { HTMLAttributes } from "react"

import { cn } from "../cn"

type BbPageShellProps = HTMLAttributes<HTMLDivElement>

export const BbPageShell = ({ className, children, ...props }: BbPageShellProps) => (
  <div className={cn("bb-page-bg min-h-screen bg-[#F9FAFB] text-[#111827]", className)} {...props}>
    {children}
  </div>
)

export default BbPageShell
