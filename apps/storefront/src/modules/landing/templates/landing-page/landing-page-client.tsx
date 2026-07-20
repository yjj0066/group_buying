"use client"

import GroupBuyCard from "@modules/landing/components/group-buy-card"
import DemoDataBanner from "@modules/landing/components/demo-data-banner"
import LandingHero from "@modules/landing/components/landing-hero"
import LiveTicker from "@modules/landing/components/live-ticker"
import AiRecommendationSlider from "@modules/products/components/ai-recommendation-slider"
import ScrollReveal from "@modules/landing/components/scroll-reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"
import type { LandingHomeData, LandingDealCategory } from "types/landing-deal"
import { clsx } from "clsx"
import { useState } from "react"

type LandingPageClientProps = {
  data: LandingHomeData
  countryCode: string
  customerId?: string | null
  favoriteIdolGroup?: string | null
  isLoggedIn?: boolean
}

const CATEGORY_KEYS: LandingDealCategory[] = [
  "albums",
  "lightsticks",
  "photocards",
  "dolls",
  "clothing",
  "accessories",
]

const REVIEW_KEYS = ["review1", "review2", "review3"] as const

const WHY_KEYS = ["authentic", "lowerPrices", "secure", "shipping"] as const

const SectionHeader = ({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
}: {
  title: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
}) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div className="max-w-2xl">
      <h2 className="text-3xl font-black tracking-tight text-neutral-900 small:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base leading-relaxed text-neutral-500">{subtitle}</p>
      )}
    </div>
    {viewAllHref && viewAllLabel && (
      <LocalizedClientLink
        href={viewAllHref}
        className="shrink-0 text-sm font-semibold text-brand-pink transition-colors hover:text-brand-purple"
      >
        {viewAllLabel} →
      </LocalizedClientLink>
    )}
  </div>
)

const LandingPageClient = ({
  data,
  countryCode,
  customerId = null,
  favoriteIdolGroup = null,
  isLoggedIn = false,
}: LandingPageClientProps) => {
  const t = useDictionary()
  const [activeCategory, setActiveCategory] = useState<LandingDealCategory | "all">(
    "all"
  )

  const liveCount = data.allDeals.reduce(
    (sum, deal) => sum + deal.currentParticipants,
    0
  )

  const filteredDeals =
    activeCategory === "all"
      ? data.allDeals
      : data.allDeals.filter((deal) => deal.category === activeCategory)

  return (
    <div className="bg-white text-neutral-900">
      <DemoDataBanner visible={data.dataSource === "mock"} />
      <LandingHero featured={data.featured} liveCount={liveCount} />
      <LiveTicker />

      {isLoggedIn && (
        <section className="mx-auto max-w-7xl px-4 py-10 small:px-6">
          <div className="rounded-3xl border border-brand-pink/20 bg-gradient-to-br from-rose-50/80 to-violet-50/50 p-6 small:p-8">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900">
              {t.landing.hub.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">{t.landing.hub.subtitle}</p>
            <div className="mt-6 grid grid-cols-1 gap-4 small:grid-cols-3">
              <LocalizedClientLink
                href="/group-buying?vacant=1"
                className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink hover:shadow-md"
              >
                <p className="text-lg font-bold text-neutral-900">
                  {t.landing.hub.searchVacant}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {t.landing.hub.searchVacantDescription}
                </p>
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/group-deals/create"
                className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-purple hover:shadow-md"
              >
                <p className="text-lg font-bold text-neutral-900">
                  {t.landing.hub.createDeal}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {t.landing.hub.createDealDescription}
                </p>
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account"
                className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink hover:shadow-md"
              >
                <p className="text-lg font-bold text-neutral-900">
                  {t.landing.hub.myPage}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {t.landing.hub.myPageDescription}
                </p>
              </LocalizedClientLink>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 small:px-6">
        {favoriteIdolGroup && (
          <p className="mb-4 text-sm text-neutral-500">
            {t.landing.aiRecommendationsForIdol.replace(
              "{idol}",
              favoriteIdolGroup
            )}
          </p>
        )}
        <AiRecommendationSlider
          context="landing"
          countryCode={countryCode}
          customerId={customerId}
          favoriteIdolGroup={favoriteIdolGroup}
          title={t.landing.aiRecommendationsTitle}
          subtitle={t.landing.aiRecommendationsSubtitle}
          viewAllHref="/store"
          viewAllLabel={t.landing.viewAllProducts}
        />
      </section>

      {/* Popular */}
      <section className="mx-auto max-w-7xl px-4 py-20 small:px-6">
        <ScrollReveal>
          <SectionHeader
            title={t.landing.popular.title}
            subtitle={t.landing.popular.subtitle}
            viewAllHref="/group-buying"
            viewAllLabel={t.landing.viewAllDeals}
          />
        </ScrollReveal>
        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
          {data.popular.map((deal, index) => (
            <ScrollReveal key={deal.id} delay={index * 80}>
              <GroupBuyCard deal={deal} variant="horizontal" showRank />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-8 small:px-6">
        <ScrollReveal>
          <SectionHeader title={t.landing.categories.title} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={clsx(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                activeCategory === "all"
                  ? "bg-neutral-900 text-white shadow-lg"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {t.landing.categories.all}
            </button>
            {CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={clsx(
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                  activeCategory === key
                    ? "bg-gradient-to-r from-brand-pink to-brand-purple text-white shadow-lg"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {t.landing.categories[key]}
              </button>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Product Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 small:px-6">
        <ScrollReveal>
          <SectionHeader
            title={t.landing.grid.title}
            subtitle={t.landing.grid.subtitle}
            viewAllHref="/group-buying"
            viewAllLabel={t.landing.viewAllDeals}
          />
        </ScrollReveal>
        <div className="grid grid-cols-1 gap-6 xsmall:grid-cols-2 large:grid-cols-3">
          {filteredDeals.map((deal, index) => (
            <ScrollReveal key={deal.id} delay={(index % 3) * 100}>
              <GroupBuyCard deal={deal} />
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-brand-pink hover:text-brand-pink"
          >
            {t.landing.viewAllProducts} →
          </LocalizedClientLink>
        </div>
      </section>

      {/* Ending Soon */}
      <section className="bg-gradient-to-b from-rose-50/50 to-white py-20">
        <div className="mx-auto max-w-7xl px-4 small:px-6">
          <ScrollReveal>
            <SectionHeader
              title={t.landing.endingSoon.title}
              subtitle={t.landing.endingSoon.subtitle}
              viewAllHref="/group-buying"
              viewAllLabel={t.landing.viewAllDeals}
            />
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 medium:grid-cols-3">
            {data.endingSoon.map((deal, index) => (
              <ScrollReveal key={deal.id} delay={index * 100}>
                <GroupBuyCard deal={deal} variant="compact" />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trending + New + Fan favorites */}
      <section className="mx-auto max-w-7xl space-y-20 px-4 py-20 small:px-6">
        {[
          { title: t.landing.trending.title, deals: data.trending },
          { title: t.landing.newlyOpened.title, deals: data.newlyOpened },
          { title: t.landing.fanFavorites.title, deals: data.fanFavorites },
        ].map((section) => (
          <div key={section.title}>
            <ScrollReveal>
              <SectionHeader
                title={section.title}
                viewAllHref="/group-buying"
                viewAllLabel={t.landing.viewAllDeals}
              />
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-6 xsmall:grid-cols-2 large:grid-cols-4">
              {section.deals.map((deal, index) => (
                <ScrollReveal key={`${section.title}-${deal.id}`} delay={index * 80}>
                  <GroupBuyCard deal={deal} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Why choose us */}
      <section id="why-us" className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 small:px-6">
          <ScrollReveal>
            <SectionHeader title={t.landing.why.title} />
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 small:grid-cols-2 large:grid-cols-4">
            {WHY_KEYS.map((key, index) => (
              <ScrollReveal key={key} delay={index * 80}>
                <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink/15 to-brand-purple/15 text-xl">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    {t.landing.why[key].title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    {t.landing.why[key].description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-20 small:px-6">
        <ScrollReveal>
          <SectionHeader title={t.landing.reviews.title} />
        </ScrollReveal>
        <div className="grid grid-cols-1 gap-6 medium:grid-cols-3">
          {REVIEW_KEYS.map((key, index) => (
            <ScrollReveal key={key} delay={index * 100}>
              <blockquote className="flex h-full flex-col rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                <p className="flex-1 text-sm leading-relaxed text-neutral-600">
                  &ldquo;{t.landing.reviews[key].quote}&rdquo;
                </p>
                <footer className="mt-6 border-t border-neutral-100 pt-4">
                  <p className="font-bold text-neutral-900">
                    {t.landing.reviews[key].author}
                  </p>
                  <p className="text-xs text-brand-purple">
                    {t.landing.reviews[key].group}
                  </p>
                </footer>
              </blockquote>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Floating widget */}
      <div className="fixed bottom-24 right-4 z-40 hidden rounded-2xl border border-neutral-100 bg-white p-4 shadow-2xl small:block medium:bottom-8">
        <p className="text-xs font-semibold text-brand-pink">
          {t.landing.floating.live}
        </p>
        <p className="mt-1 text-2xl font-black text-neutral-900">{liveCount}</p>
        <p className="text-xs text-neutral-500">{t.landing.floating.joiningNow}</p>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-100 bg-white/95 p-3 backdrop-blur small:hidden">
        <LocalizedClientLink
          href="/group-buying"
          className="landing-cta-btn flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white"
        >
          {t.landing.stickyCta}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default LandingPageClient
