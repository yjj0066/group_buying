import { HTMLAttributes, forwardRef } from "react"

import { cn } from "../cn"

type BbCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
  padding?: "none" | "sm" | "md" | "lg"
  tone?: "default" | "gradient" | "trust"
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-4",
  lg: "p-5",
}

const toneClasses = {
  default: "bg-white",
  gradient: "bg-white",
  trust: "bg-[#F5F3FF]",
}

export const BbCard = forwardRef<HTMLDivElement, BbCardProps>(
  (
    {
      className,
      interactive,
      padding = "md",
      tone = "default",
      children,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        interactive ? "bb-card-interactive" : "bb-card",
        paddingClasses[padding],
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
BbCard.displayName = "BbCard"

export default BbCard
