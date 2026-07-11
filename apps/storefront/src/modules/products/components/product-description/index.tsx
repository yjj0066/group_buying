"use client"

import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { Heading } from "@modules/common/components/ui"
import { useDictionary } from "@i18n/provider"

type ProductDescriptionProps = {
  content?: string | null
}

const ProductDescription = ({ content }: ProductDescriptionProps) => {
  const t = useDictionary()

  if (!content?.trim()) {
    return null
  }

  return (
    <section
      className="w-full border-t border-ui-border-base pt-12 mt-4"
      aria-label={t.products.detailDescription}
    >
      <Heading level="h2" className="text-xl font-semibold mb-8 text-ui-fg-base">
        {t.products.detailDescription}
      </Heading>

      <div className="product-description-content max-w-3xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-semibold text-ui-fg-base mt-8 mb-4 leading-snug">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-ui-fg-base mt-7 mb-3 leading-snug">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-ui-fg-base mt-6 mb-3 leading-snug">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-[15px] leading-[1.75] tracking-[-0.01em] text-ui-fg-subtle mb-4 whitespace-pre-wrap">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-4 space-y-2 text-[15px] leading-[1.75] text-ui-fg-subtle">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 mb-4 space-y-2 text-[15px] leading-[1.75] text-ui-fg-subtle">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="tracking-[-0.01em]">{children}</li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ui-fg-interactive underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                className="my-6 w-full max-w-2xl rounded-xl border border-ui-border-base object-cover"
                loading="lazy"
              />
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-4 border-ui-border-base pl-4 text-[15px] leading-[1.75] text-ui-fg-muted italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-8 border-ui-border-base" />,
            code: ({ children }) => (
              <code className="rounded bg-ui-bg-subtle px-1.5 py-0.5 text-sm text-ui-fg-base">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </section>
  )
}

export default ProductDescription
