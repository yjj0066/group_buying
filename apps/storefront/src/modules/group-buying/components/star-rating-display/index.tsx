import { cn } from "@modules/design-system/cn"

type StarRatingDisplayProps = {
  rating: number
  max?: number
  size?: "sm" | "md"
  className?: string
}

const StarRatingDisplay = ({
  rating,
  max = 5,
  size = "sm",
  className,
}: StarRatingDisplayProps) => {
  const clamped = Math.min(max, Math.max(0, Math.round(rating)))

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        size === "md" ? "text-xl" : "text-base",
        className
      )}
      aria-label={`${clamped}/${max}`}
    >
      {Array.from({ length: max }, (_, index) => {
        const filled = index + 1 <= clamped

        return (
          <span
            key={index}
            className={cn(
              "leading-none",
              filled ? "text-amber-400" : "text-[var(--bb-line)]"
            )}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

export default StarRatingDisplay
