"use client"

import { InputHTMLAttributes, forwardRef } from "react"

import { cn } from "../cn"

type BbSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  onSearch?: () => void
}

export const BbSearchInput = forwardRef<HTMLInputElement, BbSearchInputProps>(
  ({ className, onSearch, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--bb-mute)]"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M20 20L16.5 16.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        ref={ref}
        type="search"
        className="bb-input pl-11 pr-4"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onSearch?.()
          }
          props.onKeyDown?.(event)
        }}
        {...props}
      />
    </div>
  )
)
BbSearchInput.displayName = "BbSearchInput"

export default BbSearchInput
