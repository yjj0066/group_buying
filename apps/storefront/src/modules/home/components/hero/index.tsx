"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

const Hero = () => {
  const t = useDictionary()

  return (
    <section className="relative w-full overflow-hidden border-b border-ui-border-base">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-orange-50 to-violet-100" />
      <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/60 blur-2xl" />

      <div className="content-container relative z-10">
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 small:py-20 medium:py-24 gap-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs font-medium tracking-wide text-rose-700 shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {t.hero.badge}
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl small:text-4xl medium:text-5xl font-bold leading-tight tracking-tight text-slate-900">
              {t.hero.title}
            </h1>
            <p className="text-base small:text-lg medium:text-xl font-medium leading-relaxed text-slate-600 max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
          </div>

          <LocalizedClientLink href="/group-buying" className="mt-2">
            <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3.5 text-sm small:text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5">
              {t.hero.cta}
            </span>
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
