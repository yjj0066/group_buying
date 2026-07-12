"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { updateRegion } from "@lib/data/cart"
import {
  getActiveCurrencyOption,
  getCurrencyOptionsFromRegions,
} from "@lib/util/currency-options"
import { useDictionary } from "@i18n/provider"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"
import { Fragment, useMemo, useState } from "react"

type CurrencySelectProps = {
  regions: HttpTypes.StoreRegion[]
}

const CurrencySelect = ({ regions }: CurrencySelectProps) => {
  const t = useDictionary()
  const [isChanging, setIsChanging] = useState(false)

  const { countryCode } = useParams()
  const pathname = usePathname()
  const currentPath = pathname.split(`/${countryCode}`)[1] ?? ""

  const options = useMemo(
    () => getCurrencyOptionsFromRegions(regions),
    [regions]
  )

  const activeOption = useMemo(
    () =>
      getActiveCurrencyOption(
        options,
        regions,
        typeof countryCode === "string" ? countryCode : null
      ),
    [options, regions, countryCode]
  )

  if (options.length <= 1) {
    return null
  }

  const handleSelect = async (option: (typeof options)[number]) => {
    if (
      isChanging ||
      !activeOption ||
      option.currencyCode === activeOption.currencyCode
    ) {
      return
    }

    setIsChanging(true)

    try {
      await updateRegion(option.countryCode, currentPath)
    } catch {
      setIsChanging(false)
    }
  }

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            className={clx(
              "flex items-center justify-center min-w-[3rem] h-9 px-2 rounded-full",
              "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-subtle",
              "transition-colors duration-200 focus:outline-none text-xs font-medium",
              isChanging && "opacity-60 pointer-events-none"
            )}
            aria-label={t.nav.currencyAriaLabel}
            data-testid="currency-select-button"
            disabled={isChanging}
          >
            {activeOption?.currencyCode.toUpperCase() ?? "—"}
          </PopoverButton>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel
              className={clx(
                "absolute right-0 top-[calc(100%+8px)] z-[60]",
                "min-w-[180px] max-w-[calc(100vw-2rem)]",
                "bg-white border border-ui-border-base rounded-lg shadow-lg",
                "py-1 overflow-hidden"
              )}
              data-testid="currency-select-menu"
            >
              <ul className="flex flex-col">
                {options.map((option) => {
                  const isActive =
                    option.currencyCode === activeOption?.currencyCode

                  return (
                    <li key={option.currencyCode}>
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          void handleSelect(option)
                        }}
                        disabled={isChanging || isActive}
                        className={clx(
                          "w-full text-left px-4 py-2.5 text-sm",
                          "hover:bg-ui-bg-subtle transition-colors duration-150",
                          "disabled:cursor-default",
                          isActive
                            ? "text-ui-fg-base font-medium bg-ui-bg-subtle"
                            : "text-ui-fg-subtle"
                        )}
                        data-testid={`currency-option-${option.currencyCode}`}
                      >
                        {option.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default CurrencySelect
