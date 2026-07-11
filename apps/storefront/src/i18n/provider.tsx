"use client"

import { createContext, useContext, useMemo } from "react"

import { getDefaultDictionary, isValidDictionary } from "./fallback"
import type { Dictionary } from "./types"

const I18nContext = createContext<Dictionary | null>(null)

type I18nProviderProps = {
  dictionary?: Dictionary | null
  children: React.ReactNode
}

export const I18nProvider = ({ dictionary, children }: I18nProviderProps) => {
  const safeDictionary = useMemo(() => {
    if (isValidDictionary(dictionary)) {
      return dictionary
    }

    return getDefaultDictionary()
  }, [dictionary])

  return (
    <I18nContext.Provider value={safeDictionary}>{children}</I18nContext.Provider>
  )
}

export const useDictionary = (): Dictionary => {
  const dictionary = useContext(I18nContext)

  if (!dictionary) {
    return getDefaultDictionary()
  }

  return dictionary
}

export const formatMessage = (
  template: string,
  values: Record<string, string | number>
): string => {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  )
}
