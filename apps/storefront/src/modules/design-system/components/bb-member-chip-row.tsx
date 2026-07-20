import { cn } from "../cn"

export type MemberChipItem = {
  label: string
  vacant: boolean
  highlight?: boolean
}

type BbMemberChipRowProps = {
  members: MemberChipItem[]
  className?: string
  max?: number
}

export const BbMemberChipRow = ({
  members,
  className,
  max = 6,
}: BbMemberChipRowProps) => (
  <div className={cn("flex flex-wrap gap-1", className)}>
    {members.slice(0, max).map((member) => (
      <span
        key={member.label}
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
          member.vacant
            ? member.highlight
              ? "bg-[#E1F5EE] text-[#0B6E53] ring-1 ring-[#0B6E53]/20"
              : "bg-[#E1F5EE] text-[#0B6E53]"
            : "bg-[#F3F4F6] text-[#9CA3AF] line-through"
        )}
      >
        {member.label}
      </span>
    ))}
  </div>
)

export default BbMemberChipRow
