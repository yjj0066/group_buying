import { cn } from "@modules/design-system"

import { POKACATCH_PALETTE, type PokaCatchLogoVariant } from "./constants"
import { PokaCatchLogoIcon } from "./pokacatch-logo-icon"

export type PokaCatchLogoProps = {
  variant?: PokaCatchLogoVariant
  wordmark?: string
  showWordmark?: boolean
  iconSize?: number
  wordmarkClassName?: string
  className?: string
  title?: string
}

/**
 * Horizontal lockup: icon + bold rounded wordmark (navbar default).
 */
export const PokaCatchLogo = ({
  variant = "light",
  wordmark = "포카캐치",
  showWordmark = true,
  iconSize = 32,
  wordmarkClassName,
  className,
  title,
}: PokaCatchLogoProps) => {
  const colors = POKACATCH_PALETTE[variant]
  const label = title ?? (showWordmark ? wordmark : "포카캐치")

  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      role={title ? "img" : undefined}
      aria-label={label}
    >
      <PokaCatchLogoIcon size={iconSize} variant={variant} title={undefined} />
      {showWordmark ? (
        <span
          className={cn(
            "font-extrabold tracking-tight",
            "text-[length:var(--pokacatch-wordmark-size,1.125rem)]",
            "leading-none [font-feature-settings:'ss01']",
            wordmarkClassName
          )}
          style={{ color: colors.wordmark }}
          aria-hidden
        >
          {wordmark}
        </span>
      ) : null}
    </span>
  )
}
