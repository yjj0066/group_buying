import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getGroupBuyingMode } from "@lib/data/group-buying-mode"
import { getServerDictionary } from "@i18n/server"

const NavGroupBuyEntry = async () => {
  const [dictionary, mode] = await Promise.all([
    getServerDictionary(),
    getGroupBuyingMode(),
  ])

  const modeLabel =
    mode === "leader"
      ? dictionary.gbApp.modeLeader
      : dictionary.gbApp.modeParticipant

  return (
    <LocalizedClientLink
      className="hidden small:inline-flex items-center gap-2 hover:text-ui-fg-base whitespace-nowrap shrink-0"
      href="/home"
      data-testid="nav-group-buy-app-link"
    >
      <span>{dictionary.gbApp.navEntryLabel}</span>
      <span className="rounded-full bg-brand-pink/10 px-2 py-0.5 text-[10px] font-bold text-brand-purple">
        {modeLabel}
      </span>
    </LocalizedClientLink>
  )
}

export default NavGroupBuyEntry
