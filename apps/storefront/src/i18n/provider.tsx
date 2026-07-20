"use client"

import { createContext, useContext, ReactNode } from "react"

import { formatMessage } from "./format-message"
import type { Dictionary } from "./types"

export { formatMessage }

const I18nContext = createContext<Dictionary | null>(null)

export const I18nProvider = ({
  children,
  dictionary,
}: {
  children: ReactNode
  dictionary: Dictionary
}) => (
  <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>
)

export const useDictionary = (): Dictionary => {
  const dictionary = useContext(I18nContext)

  if (!dictionary) {
    throw new Error("useDictionary must be used within I18nProvider")
  }

  return dictionary
}

