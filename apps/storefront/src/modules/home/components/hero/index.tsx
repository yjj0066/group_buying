"use client"

import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

const HOLOGRAM_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=480&h=640&fit=crop",
    alt: "Stage performance",
    className: "left-[4%] top-[8%] -rotate-6 w-28 small:w-36 medium:w-44",
  },
  {
    src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=480&h=640&fit=crop",
    alt: "Concert atmosphere",
    className: "right-[6%] top-[12%] rotate-6 w-24 small:w-32 medium:w-40",
  },
  {
    src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=480&h=640&fit=crop",
    alt: "Neon stage lights",
    className: "left-[12%] bottom-[10%] rotate-3 w-20 small:w-28 medium:w-36",
  },
  {
    src: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=480&h=640&fit=crop",
    alt: "Live performance energy",
    className: "right-[10%] bottom-[8%] -rotate-3 w-24 small:w-32 medium:w-40",
  },
]

const Hero = () => {
  const t = useDictionary()

  return (
    <section className="relative w-full overflow-hidden border-b border-violet-200/40">
      <div className="absolute inset-0 cosmic-bg" />
      <div className="absolute inset-0 sparkle-field" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-1 neon-band-top" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1 neon-band-bottom" aria-hidden="true" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {HOLOGRAM_IMAGES.map((image) => (
          <div
            key={image.src}
            className={`absolute hologram-frame ${image.className}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={176}
              height={220}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      <div className="content-container relative z-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-8 px-4 py-16 text-center small:py-20 medium:py-24">
          <div className="hologram-badge inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold tracking-wide">
            <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
            {t.hero.badge}
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md small:text-4xl medium:text-5xl">
              {t.hero.title}
            </h1>
            <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-violet-100/90 small:text-lg medium:text-xl">
              {t.hero.subtitle}
            </p>
          </div>

          <LocalizedClientLink href="/group-buying" className="mt-2">
            <span className="cta-glow inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white small:text-base">
              {t.hero.cta}
            </span>
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
