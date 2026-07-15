"use client"

import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatMessage, useDictionary } from "@i18n/provider"
import type { LandingDealCard } from "types/landing-deal"

type LandingHeroProps = {
  featured: LandingDealCard
  liveCount: number
}

type HeroWeeklyDeal = {
  id: string
  title: string
  priceLabel: string
  imageUrl: string
  imageAlt: string
  currentParticipants: number
  targetParticipants: number
  href: string
}

const HERO_WEEKLY_DEALS: HeroWeeklyDeal[] = [
  {
    id: "hero-bts-proof",
    title: "BTS 'Proof' Album Standard Ed.",
    priceLabel: "₩12,000 | 33% 할인",
    imageUrl:
      "https://images.unsplash.com/photo-1619983081563-430f6360275f?w=600&h=600&fit=crop",
    imageAlt: "BTS Proof album",
    currentParticipants: 312,
    targetParticipants: 400,
    href: "/group-buying/mock-bts-album",
  },
  {
    id: "hero-bp-lightstick",
    title: "BLACKPINK Lightstick [Ver.2]",
    priceLabel: "₩12,000 | 33% 할인",
    imageUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop",
    imageAlt: "BLACKPINK lightstick Ver.2",
    currentParticipants: 312,
    targetParticipants: 400,
    href: "/group-buying/mock-ive-lightstick",
  },
  {
    id: "hero-exo-photobook",
    title: "EXO 11th Aniv. Photobook",
    priceLabel: "₩11,000 | 33% 할인",
    imageUrl:
      "https://images.unsplash.com/photo-1571330737116-fde987fa9327?w=600&h=600&fit=crop",
    imageAlt: "EXO 11th Anniversary Photobook",
    currentParticipants: 312,
    targetParticipants: 400,
    href: "/group-buying/mock-newjeans-pc",
  },
]

const SUMMARY = {
  originalPrice: "₩18,000",
  expectedPrice: "₩12,000",
  currentParticipants: 312,
  targetParticipants: 400,
  achievementPercent: 78,
}

const HeroWeeklyCard = ({ deal }: { deal: HeroWeeklyDeal }) => {
  const t = useDictionary()
  const progress = Math.round(
    (deal.currentParticipants / deal.targetParticipants) * 100
  )

  return (
    <LocalizedClientLink
      href={deal.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-md backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-pink/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <Image
          src={deal.imageUrl}
          alt={deal.imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 200px"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900">
          {deal.title}
        </h3>
        <p className="text-xs font-semibold text-brand-pink">{deal.priceLabel}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="landing-progress-bar h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-purple"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] font-medium text-neutral-500">
          {formatMessage(t.landing.participants, {
            current: deal.currentParticipants,
            target: deal.targetParticipants,
          })}
        </p>
      </div>
    </LocalizedClientLink>
  )
}

const LandingHero = ({ featured, liveCount }: LandingHeroProps) => {
  const t = useDictionary()

  return (
    <section className="relative overflow-hidden">
      <div className="landing-hero-gradient absolute inset-0" />
      <div className="absolute inset-0 landing-sparkle opacity-40" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 small:px-6 medium:grid-cols-2 medium:items-start medium:gap-12 medium:py-24">
        {/* Left — headline, CTAs, live badge */}
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
        </div>

        {/* Right — weekly popular grid + compact summary */}
        <div className="flex w-full flex-col gap-4">
          <h2 className="text-lg font-black tracking-tight text-neutral-900">
            {t.landing.hero.weeklyPopularTitle}
          </h2>

          <div className="grid grid-cols-1 gap-3 small:grid-cols-3">
            {HERO_WEEKLY_DEALS.map((deal) => (
              <HeroWeeklyCard key={deal.id} deal={deal} />
            ))}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-bold text-neutral-800">
                  {t.landing.priceDropTitle}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="text-neutral-400 line-through">
                    {t.landing.targetPrice}: {SUMMARY.originalPrice}
                  </span>
                  <span className="font-bold text-neutral-900">
                    {t.landing.hero.summaryExpectedPrice}: {SUMMARY.expectedPrice}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
                  <span>
                    {formatMessage(t.landing.participants, {
                      current: SUMMARY.currentParticipants,
                      target: SUMMARY.targetParticipants,
                    })}
                  </span>
                  <span className="font-semibold text-brand-purple">
                    {formatMessage(t.landing.hero.summaryAchievementRate, {
                      percent: SUMMARY.achievementPercent,
                    })}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="landing-progress-bar h-full rounded-full bg-gradient-to-r from-brand-pink via-brand-purple to-brand-pink"
                    style={{ width: `${SUMMARY.achievementPercent}%` }}
                  />
                </div>
              </div>
              <p className="shrink-0 text-3xl font-black tabular-nums text-neutral-900 small:text-4xl">
                {SUMMARY.expectedPrice}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
