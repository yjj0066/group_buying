"use client"

import { cn } from "@modules/design-system/cn"

type StarRatingInputProps = {
  value: number
  onChange: (rating: number) => void
  max?: number
  ariaLabel: string
}

const StarRatingInput = ({
  value,
  onChange,
  max = 5,
  ariaLabel,
}: StarRatingInputProps) => {
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {Array.from({ length: max }, (_, index) => {
        const rating = index + 1
        const selected = rating <= value

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating}`}
            className={cn(
              "text-2xl leading-none transition-transform hover:scale-110",
              selected ? "text-amber-400" : "text-[var(--bb-line)]"
            )}
            onClick={() => onChange(rating)}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export default StarRatingInput
