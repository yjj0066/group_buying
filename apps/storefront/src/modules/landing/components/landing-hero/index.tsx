"use client"

import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatMessage, useDictionary } from "@i18n/provider"
import type { LandingDealCard } from "types/landing-deal"

const HERO_VISUAL_IMAGE = "/images/landing/hero-concert-venue.jpg"

type LandingHeroProps = {
  featured: LandingDealCard
  liveCount: number
}

const LandingHero = ({ featured, liveCount }: LandingHeroProps) => {
  const t = useDictionary()

  return (
    <section className="relative overflow-hidden">
      <div className="landing-hero-gradient absolute inset-0" />
      <div className="absolute inset-0 landing-sparkle opacity-40" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 small:px-6 medium:grid-cols-2 medium:items-center medium:gap-12 medium:py-24">
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

        <div className="relative w-full overflow-hidden rounded-3xl border border-white/70 bg-neutral-900 shadow-2xl shadow-brand-purple/20 ring-1 ring-white/10">
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={HERO_VISUAL_IMAGE}
              alt={t.landing.hero.visualAlt}
              fill
              priority
              className="object-cover object-[center_35%] scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/25 to-neutral-900/10"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-brand-purple/25 via-transparent to-brand-pink/20 mix-blend-soft-light"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-6 small:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-pink">
                {t.landing.hero.visualEyebrow}
              </p>
              <p className="mt-2 whitespace-pre-line text-xl font-black leading-snug text-white small:text-2xl">
                {t.landing.hero.visualCaption}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
