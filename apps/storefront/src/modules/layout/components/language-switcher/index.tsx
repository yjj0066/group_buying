"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { updateLocale } from "@lib/data/locale-actions"
import { GlobeEurope } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from "@i18n/constants"
import { medusaLocaleToUiLocale } from "@i18n/config"
import { Fragment, useState } from "react"

type LanguageSwitcherProps = {
  currentLocale?: string | null
}

const setLocaleCookieClient = (localeCode: string) => {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${LOCALE_COOKIE_NAME}=${localeCode}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Strict${secure}`
}

const LanguageSwitcher = ({ currentLocale = null }: LanguageSwitcherProps) => {
  const [isChanging, setIsChanging] = useState(false)

  const activeUiLocale = medusaLocaleToUiLocale(currentLocale ?? null)

  const handleSelect = async (localeCode: string) => {
    const selectedLocale = SUPPORTED_LOCALES.find(
      (locale) => locale.code === localeCode
    )

    if (!selectedLocale || selectedLocale.uiCode === activeUiLocale || isChanging) {
      return
    }

    setIsChanging(true)

    try {
      await updateLocale(localeCode)
    } catch {
      setLocaleCookieClient(localeCode)
    }

    window.location.href = window.location.pathname + window.location.search
  }

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            className={clx(
              "flex items-center justify-center w-9 h-9 rounded-full",
              "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-subtle",
              "transition-colors duration-200 focus:outline-none",
              isChanging && "opacity-60 pointer-events-none"
            )}
            aria-label="Change language"
            data-testid="language-switcher-button"
            disabled={isChanging}
          >
            <GlobeEurope className="w-5 h-5" />
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
              data-testid="language-switcher-menu"
            >
              <ul className="flex flex-col">
                {SUPPORTED_LOCALES.map((locale) => {
                  const isActive = locale.uiCode === activeUiLocale

                  return (
                    <li key={locale.code}>
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          void handleSelect(locale.code)
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
                        data-testid={`language-option-${locale.uiCode}`}
                      >
                        {locale.nativeName}
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

export default LanguageSwitcher
