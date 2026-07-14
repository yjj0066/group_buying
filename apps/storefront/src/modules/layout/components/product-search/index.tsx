"use client"

import { MagnifyingGlassMini } from "@medusajs/icons"
import { useDictionary } from "@i18n/provider"
import { SEARCH_QUERY_KEY } from "@lib/util/product-filters"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

type ProductSearchProps = {
  variant?: "nav" | "sidebar"
  className?: string
}

const ProductSearch = ({
  variant = "nav",
  className = "",
}: ProductSearchProps) => {
  const t = useDictionary()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get(SEARCH_QUERY_KEY) ?? "")

  useEffect(() => {
    setQuery(searchParams.get(SEARCH_QUERY_KEY) ?? "")
  }, [searchParams])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const countryCode = params.countryCode as string
    const nextParams = new URLSearchParams(searchParams.toString())
    const trimmed = query.trim()

    if (trimmed) {
      nextParams.set(SEARCH_QUERY_KEY, trimmed)
    } else {
      nextParams.delete(SEARCH_QUERY_KEY)
    }

    nextParams.delete("page")

    const queryString = nextParams.toString()
    router.push(
      `/${countryCode}/store${queryString ? `?${queryString}` : ""}`
    )
  }

  const isSidebar = variant === "sidebar"

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      data-testid="product-search-form"
    >
      {isSidebar && (
        <label
          htmlFor="product-search-input"
          className="txt-compact-small-plus text-ui-fg-muted mb-3 block"
        >
          {t.products.searchLabel}
        </label>
      )}
      <div
        className={
          isSidebar
            ? "flex w-full gap-x-2"
            : "flex items-center w-full max-w-[220px] small:max-w-[280px]"
        }
      >
        <input
          id="product-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.products.searchPlaceholder}
          aria-label={t.products.searchAriaLabel}
          className={
            isSidebar
              ? "flex-1 h-10 px-3 txt-compact-small border border-ui-border-base rounded-rounded bg-ui-bg-field hover:bg-ui-bg-field-hover focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
              : "flex-1 h-8 px-3 txt-compact-small border border-ui-border-base rounded-rounded bg-ui-bg-subtle hover:bg-ui-bg-field focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
          }
          data-testid="product-search-input"
        />
        <button
          type="submit"
          className={
            isSidebar
              ? "h-10 px-4 txt-compact-small-plus border border-ui-border-base rounded-rounded bg-ui-bg-base hover:bg-ui-bg-base-hover"
              : "h-8 w-8 flex items-center justify-center border border-ui-border-base rounded-rounded bg-ui-bg-base hover:bg-ui-bg-base-hover shrink-0"
          }
          aria-label={t.products.searchAriaLabel}
          data-testid="product-search-submit"
        >
          {isSidebar ? (
            t.products.searchSubmit
          ) : (
            <MagnifyingGlassMini />
          )}
        </button>
      </div>
    </form>
  )
}

export default ProductSearch
