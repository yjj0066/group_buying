"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import {
  getDiscountPercent,
  getParticipationRate,
  getSpotsLeft,
} from "@lib/util/landing-deals"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatMessage, useDictionary } from "@i18n/provider"
import type { LandingDealCard } from "types/landing-deal"

type LandingHeroProps = {
  featured: LandingDealCard
  liveCount: number
}

const formatCountdown = (endsAt: string) => {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now())
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  }
}

const PLACEHOLDER_COUNTDOWN = {
  hours: "--",
  minutes: "--",
  seconds: "--",
}

const LandingHero = ({ featured, liveCount }: LandingHeroProps) => {
  const t = useDictionary()
  const [countdown, setCountdown] = useState(PLACEHOLDER_COUNTDOWN)
  const progress = getParticipationRate(featured)
  const spotsLeft = getSpotsLeft(featured)
  const discount = getDiscountPercent(featured)

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(featured.endsAt))

    update()
    const timer = setInterval(update, 1000)

    return () => clearInterval(timer)
  }, [featured.endsAt])

  return (
    <section className="relative overflow-hidden">
      <div className="landing-hero-gradient absolute inset-0" />
      <div className="absolute inset-0 landing-sparkle opacity-40" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 small:px-6 medium:grid-cols-2 medium:items-center medium:py-24">
        <div className="flex flex-col gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-brand-purple shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-pink opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-pink" />
            </span>
            {formatMessage(t.landing.hero.liveParticipants, { count: liveCount })}
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-pink">
              {t.landing.hero.eyebrow}
            </p>
            <h1 className="mt-3 whitespace-pre-line text-4xl font-black leading-[1.05] tracking-tight text-neutral-900 small:text-5xl medium:text-6xl">
              {t.landing.hero.headline}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-neutral-600">
              {t.landing.hero.subheadline}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/group-buying"
              className="landing-cta-btn rounded-full px-8 py-4 text-base font-bold text-white"
            >
              {t.landing.hero.cta}
            </LocalizedClientLink>
            <LocalizedClientLink
              href={featured.href}
              className="rounded-full border border-neutral-200 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-brand-pink hover:text-brand-pink"
            >
              {t.landing.hero.featuredCta}
            </LocalizedClientLink>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-700">
                {t.landing.priceDropTitle}
              </span>
              <span className="font-bold text-brand-pink">
                {formatMessage(t.landing.spotsLeft, { count: spotsLeft })}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-500">{t.landing.targetPrice}</p>
                <p className="text-lg font-bold text-neutral-400 line-through">
                  {convertToLocale({
                    amount: featured.originalPrice,
                    currency_code: featured.currencyCode,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500">{t.landing.currentPrice}</p>
                <p className="text-2xl font-black text-neutral-900">
                  {convertToLocale({
                    amount: featured.currentPrice,
                    currency_code: featured.currencyCode,
                  })}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="landing-progress-bar h-full rounded-full bg-gradient-to-r from-brand-pink via-brand-purple to-brand-pink"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {formatMessage(t.landing.participants, {
                current: featured.currentParticipants,
                target: featured.targetParticipants,
              })}
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md medium:max-w-none">
          <div className="landing-hero-card relative overflow-hidden rounded-[2rem] border border-white/50 bg-white p-4 shadow-2xl">
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem]">
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width:768px) 100vw, 480px"
              />
              <span className="absolute left-4 top-4 rounded-full bg-brand-pink px-3 py-1 text-xs font-bold text-white">
                -{discount}%
              </span>
            </div>

            <div className="mt-5 space-y-3 px-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-purple">
                {featured.groupName} · {t.landing.groupBuyLabel}
              </p>
              <h2 className="text-xl font-bold text-neutral-900">{featured.title}</h2>

              <div className="flex items-center justify-center gap-3 rounded-2xl bg-neutral-50 py-4">
                {[countdown.hours, countdown.minutes, countdown.seconds].map(
                  (value, index) => (
                    <div key={index} className="text-center">
                      <span className="block text-2xl font-black tabular-nums text-neutral-900">
                        {value}
                      </span>
                      <span className="text-[10px] uppercase text-neutral-400">
                        {index === 0 ? "H" : index === 1 ? "M" : "S"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
