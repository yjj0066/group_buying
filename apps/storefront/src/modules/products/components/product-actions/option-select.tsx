import { HttpTypes } from "@medusajs/types"
import { useDictionary, formatMessage } from "@i18n/provider"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const MEMBER_ACCENT_COLORS = [
  "border-rose-400 bg-rose-50 text-rose-700 shadow-rose-100",
  "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 shadow-fuchsia-100",
  "border-violet-400 bg-violet-50 text-violet-700 shadow-violet-100",
  "border-sky-400 bg-sky-50 text-sky-700 shadow-sky-100",
  "border-amber-400 bg-amber-50 text-amber-700 shadow-amber-100",
  "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-emerald-100",
]

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const t = useDictionary()
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-semibold text-ui-fg-base">
        {formatMessage(t.idol.optionSelect, { title })}
      </span>
      <div
        className="grid grid-cols-2 gap-2 small:grid-cols-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((value, index) => {
          const isSelected = value === current
          const accentClass =
            MEMBER_ACCENT_COLORS[index % MEMBER_ACCENT_COLORS.length]

          return (
            <button
              onClick={() => updateOption(option.id, value)}
              key={value}
              type="button"
              className={clx(
                "rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0",
                {
                  [accentClass]: isSelected,
                  "border-ui-border-base bg-white text-ui-fg-subtle hover:border-ui-border-interactive":
                    !isSelected,
                  "shadow-md scale-[1.02]": isSelected,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              <span className="block leading-snug">{value}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
