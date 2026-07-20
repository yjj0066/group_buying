import { formatMessage } from "@i18n/server"
import type { Dictionary } from "@i18n/types"
import type { FlaskSynonymExpansion } from "types/flask-search"
import { Text } from "@modules/common/components/ui"

type FlaskSearchMetaProps = {
  dictionary: Dictionary
  model?: string
  semanticEngine?: string
  synonymExpansion?: FlaskSynonymExpansion
}

const FlaskSearchMeta = ({
  dictionary,
  model,
  semanticEngine,
  synonymExpansion,
}: FlaskSearchMetaProps) => {
  const expandedTerms = synonymExpansion?.expandedTerms ?? []
  const hasSynonyms = expandedTerms.length > 0 || Boolean(synonymExpansion?.expandedQuery)
  const engineLabel = semanticEngine ?? model ?? "hybrid"

  if (!hasSynonyms && !model && !semanticEngine) {
    return null
  }

  return (
    <div
      className="mb-6 flex flex-col gap-y-2 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3"
      data-testid="flask-search-meta"
    >
      <Text className="text-xs font-medium text-violet-800">
        {dictionary.products.aiSearchActive.replace("{model}", engineLabel)}
      </Text>

      {hasSynonyms && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="text-xs text-violet-700">
            {dictionary.products.searchSynonymExpansion}
          </Text>
          {synonymExpansion?.expandedQuery ? (
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200">
              {synonymExpansion.expandedQuery}
            </span>
          ) : (
            expandedTerms.map((term) => (
              <span
                key={term}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200"
              >
                {term}
              </span>
            ))
          )}
        </div>
      )}

      {synonymExpansion?.originalQuery &&
        synonymExpansion.originalQuery !== synonymExpansion.expandedQuery && (
          <Text className="text-[11px] text-violet-600/90">
            {formatMessage(dictionary.products.searchOriginalQuery, {
              query: synonymExpansion.originalQuery,
            })}
          </Text>
        )}
    </div>
  )
}

export default FlaskSearchMeta
