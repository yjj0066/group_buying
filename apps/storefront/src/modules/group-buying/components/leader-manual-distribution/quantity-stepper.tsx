"use client"

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  decreaseAriaLabel: string
  increaseAriaLabel: string
  inputAriaLabel: string
  onChange: (nextValue: number) => void
}

const QuantityStepper = ({
  value,
  min = 0,
  max,
  decreaseAriaLabel,
  increaseAriaLabel,
  inputAriaLabel,
  onChange,
}: QuantityStepperProps) => {
  const handleChange = (nextValue: number) => {
    onChange(Math.max(min, Math.min(max, nextValue)))
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--bb-line)] text-sm font-bold text-[var(--bb-ink)] disabled:opacity-40"
        onClick={() => handleChange(value - 1)}
        disabled={value <= min}
        aria-label={decreaseAriaLabel}
      >
        -
      </button>
      <input
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        aria-label={inputAriaLabel}
        className="bb-input h-7 w-12 px-1 text-center text-xs"
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value)

          if (!Number.isFinite(parsed)) {
            return
          }

          handleChange(parsed)
        }}
      />
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--bb-line)] text-sm font-bold text-[var(--bb-ink)] disabled:opacity-40"
        onClick={() => handleChange(value + 1)}
        disabled={value >= max}
        aria-label={increaseAriaLabel}
      >
        +
      </button>
    </div>
  )
}

export default QuantityStepper
