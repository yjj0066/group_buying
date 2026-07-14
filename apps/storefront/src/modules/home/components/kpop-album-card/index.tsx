"use client"

import Image from "next/image"

import { convertToLocale } from "@lib/util/money"
import { KpopAlbumMock } from "@lib/data/kpop-albums"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import { formatMessage, useDictionary } from "@i18n/provider"

type KpopAlbumCardProps = {
  album: KpopAlbumMock
}

const getDaysLeft = (endsAt: string) => {
  const end = new Date(endsAt)
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const getParticipationRate = (current: number, target: number) => {
  if (target <= 0) {
    return 0
  }

  return Math.min(100, Math.round((current / target) * 100))
}

const KpopAlbumCard = ({ album }: KpopAlbumCardProps) => {
  const t = useDictionary()
  const daysLeft = getDaysLeft(album.endsAt)
  const progress = getParticipationRate(
    album.currentParticipants,
    album.targetParticipants
  )

  const dDayLabel =
    daysLeft === 0
      ? t.albumShowcase.dDayToday
      : formatMessage(t.albumShowcase.dDay, { days: daysLeft })

  return (
    <LocalizedClientLink
      href="/group-buying"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/60"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={album.coverImageUrl}
          alt={`${album.groupName} - ${album.albumTitle}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 512px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
          {dDayLabel}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
          {album.groupName}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Text className="line-clamp-2 text-sm font-semibold leading-snug text-ui-fg-base">
            {album.albumTitle}
          </Text>
        </div>

        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between text-[11px] text-ui-fg-subtle">
            <Text as="span">
              {formatMessage(t.albumShowcase.participants, {
                current: album.currentParticipants,
                target: album.targetParticipants,
              })}
            </Text>
            <Text as="span" className="font-semibold text-violet-600">
              {progress}%
            </Text>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-violet-100/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60" />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col">
            <Text className="text-[11px] text-ui-fg-muted line-through">
              {convertToLocale({
                amount: album.originalPrice,
                currency_code: album.currencyCode,
              })}
            </Text>
            <Text className="text-lg font-bold text-ui-fg-base">
              {convertToLocale({
                amount: album.price,
                currency_code: album.currencyCode,
              })}
            </Text>
          </div>
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {t.albumShowcase.viewDeal}
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}

export default KpopAlbumCard
