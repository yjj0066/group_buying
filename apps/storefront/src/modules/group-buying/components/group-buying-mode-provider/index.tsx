"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"
import { useParams, usePathname, useRouter } from "next/navigation"

import {
  setGroupBuyingMode,
  setGroupBuyingModeCookie,
} from "@lib/data/group-buying-mode"
import {
  GROUP_BUYING_MODE_COOKIE,
  resolveModeRedirectPath,
  type GroupBuyingMode,
} from "@lib/group-buying/mode"

type GroupBuyingModeContextValue = {
  mode: GroupBuyingMode
  setMode: (next: GroupBuyingMode) => void
  isPending: boolean
}

const GroupBuyingModeContext = createContext<GroupBuyingModeContextValue | null>(
  null
)

type GroupBuyingModeProviderProps = {
  initialMode: GroupBuyingMode
  children: React.ReactNode
}

export const GroupBuyingModeProvider = ({
  initialMode,
  children,
}: GroupBuyingModeProviderProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const [mode, setModeState] = useState<GroupBuyingMode>(initialMode)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const hasCookie = document.cookie
      .split("; ")
      .some((part) => part.startsWith(`${GROUP_BUYING_MODE_COOKIE}=`))

    if (!hasCookie) {
      void setGroupBuyingModeCookie(initialMode)
    }
  }, [initialMode])

  const setMode = useCallback(
    (next: GroupBuyingMode) => {
      if (next === mode) {
        return
      }

      const previousMode = mode
      setModeState(next)

      const pathAfterCountry =
        pathname.replace(`/${countryCode}`, "") || "/"
      const redirectPath = resolveModeRedirectPath(next, pathAfterCountry)

      startTransition(() => {
        if (redirectPath) {
          router.push(`/${countryCode}${redirectPath}`)
        } else {
          router.refresh()
        }
      })

      void setGroupBuyingMode(next).then((updated) => {
        setModeState(updated)
      }).catch(() => {
        setModeState(previousMode)
      })
    },
    [countryCode, mode, pathname, router]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isPending,
    }),
    [isPending, mode, setMode]
  )

  return (
    <GroupBuyingModeContext.Provider value={value}>
      {children}
    </GroupBuyingModeContext.Provider>
  )
}

export const useGroupBuyingMode = () => {
  const context = useContext(GroupBuyingModeContext)

  if (!context) {
    throw new Error(
      "useGroupBuyingMode must be used within GroupBuyingModeProvider"
    )
  }

  return context
}

export default GroupBuyingModeProvider
