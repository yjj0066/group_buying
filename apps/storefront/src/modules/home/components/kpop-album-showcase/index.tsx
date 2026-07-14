import { KPOP_ALBUM_SHOWCASE } from "@lib/data/kpop-albums"
import { Heading, Text } from "@modules/common/components/ui"
import { getServerDictionary } from "@i18n/server"

import KpopAlbumCard from "../kpop-album-card"

const KpopAlbumShowcase = async () => {
  const dictionary = await getServerDictionary()

  return (
    <section className="content-container pb-16 pt-4">
      <div className="mb-8 flex flex-col gap-y-2">
        <Heading level="h2" className="text-xl font-semibold text-ui-fg-base">
          {dictionary.albumShowcase.title}
        </Heading>
        <Text className="max-w-xl text-ui-fg-subtle">
          {dictionary.albumShowcase.subtitle}
        </Text>
      </div>

      <ul className="grid grid-cols-1 gap-6 xsmall:grid-cols-2">
        {KPOP_ALBUM_SHOWCASE.map((album) => (
          <li key={album.id}>
            <KpopAlbumCard album={album} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default KpopAlbumShowcase
