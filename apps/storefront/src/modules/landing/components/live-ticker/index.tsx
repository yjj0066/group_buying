"use client"

import { useEffect, useState } from "react"

import { formatMessage, useDictionary } from "@i18n/provider"

const TICKER_MESSAGES = [
  { name: "민지", group: "NewJeans", action: "joined" },
  { name: "지민", group: "BTS", action: "joined" },
  { name: "원영", group: "IVE", action: "joined" },
  { name: "카리나", group: "aespa", action: "waitlist" },
  { name: "성찬", group: "RIIZE", action: "joined" },
]

const LiveTicker = () => {
  const t = useDictionary()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % TICKER_MESSAGES.length)
    }, 3200)

    return () => clearInterval(timer)
  }, [])

  const item = TICKER_MESSAGES[index]
  const message =
    item.action === "waitlist"
      ? formatMessage(t.landing.ticker.waitlist, {
          name: item.name,
          group: item.group,
        })
      : formatMessage(t.landing.ticker.joined, {
          name: item.name,
          group: item.group,
        })

  return (
    <div className="border-y border-neutral-100 bg-neutral-50/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-sm small:px-6">
        <span className="shrink-0 rounded-full bg-brand-pink/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-pink">
          LIVE
        </span>
        <p
          key={index}
          className="truncate font-medium text-neutral-700 animate-fade-in-top"
        >
          {message}
        </p>
      </div>
    </div>
  )
}

export default LiveTicker
