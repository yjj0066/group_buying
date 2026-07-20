import { cn } from "../cn"

type BbStepsProps = {
  steps: string[]
  currentIndex: number
  className?: string
}

export const BbSteps = ({ steps, currentIndex, className }: BbStepsProps) => (
  <div className={cn("flex gap-1", className)}>
    {steps.map((step, index) => {
      const active = index === currentIndex
      const done = index < currentIndex

      return (
        <div key={step} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              "flex h-7 w-full items-center justify-center rounded-full text-[10px] font-bold",
              active && "bg-[#6B46E5] text-white",
              done && !active && "bg-[#DDD6FE] text-[#6B46E5]",
              !active && !done && "bg-[#F3F4F6] text-[#9CA3AF]"
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium text-center leading-tight",
              active ? "text-[#6B46E5] font-bold" : "text-[#9CA3AF]"
            )}
          >
            {step}
          </span>
        </div>
      )
    })}
  </div>
)

export default BbSteps
