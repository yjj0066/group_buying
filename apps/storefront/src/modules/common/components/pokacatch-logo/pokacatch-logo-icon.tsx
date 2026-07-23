import { cn } from "@modules/design-system"

import { POKACATCH_PALETTE, type PokaCatchLogoVariant } from "./constants"

export type PokaCatchLogoIconProps = {
  size?: number
  variant?: PokaCatchLogoVariant
  className?: string
  title?: string
}

/**
 * Flat vector mark: rounded photocard with lifted corner + sparkles.
 * Optimized for navbar sizes (24px+).
 */
export const PokaCatchLogoIcon = ({
  size = 32,
  variant = "light",
  className,
  title,
}: PokaCatchLogoIconProps) => {
  const c = POKACATCH_PALETTE[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Sparkle — upper left */}
      <path
        d="M5.2 6.2L5.75 7.25L6.8 7.8L5.75 8.35L5.2 9.4L4.65 8.35L3.6 7.8L4.65 7.25L5.2 6.2Z"
        fill={c.sparkle}
      />

      {/* Lifted corner — "catch" motion */}
      <path
        d="M18.75 7.25L24.85 5.15L24.85 11.35L18.75 13.45Z"
        fill={c.flapFill}
        stroke={c.cardStroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M18.75 9.35C20.4 9.85 22.2 10.55 24.85 11.35"
        stroke={c.motion}
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Main photocard */}
      <rect
        x="7"
        y="9"
        width="15"
        height="20"
        rx="3.5"
        fill={c.cardFill}
        stroke={c.cardStroke}
        strokeWidth="1.75"
      />
      <rect
        x="9.5"
        y="12.25"
        width="10"
        height="11.5"
        rx="1.75"
        fill={c.innerFill}
      />

      {/* Sparkle — near catch */}
      <path
        d="M26.4 14.1L26.78 14.72L27.4 15.1L26.78 15.48L26.4 16.1L26.02 15.48L25.4 15.1L26.02 14.72L26.4 14.1Z"
        fill={c.sparkle}
      />
    </svg>
  )
}
