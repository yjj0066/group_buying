"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import * as Accordion from "@radix-ui/react-accordion"

import { useDebouncedValue } from "@lib/hooks/use-debounced-value"
import { useDictionary } from "@i18n/provider"
import { filterSupportFaq } from "@lib/data/support-faq"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  BbButton,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

const MySupportView = () => {
  const t = useDictionary()
  const cs = t.account.customerService
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 200)

  const typeParam = searchParams.get("type")
  const dealIdParam = searchParams.get("dealId")
  const transactionIdParam = searchParams.get("transactionId")

  const filteredFaq = useMemo(
    () => filterSupportFaq(cs.faqCategories, debouncedQuery),
    [cs.faqCategories, debouncedQuery]
  )

  const disputeHref = useMemo(() => {
    const params = new URLSearchParams()

    if (dealIdParam) {
      params.set("dealId", dealIdParam)
    }

    if (transactionIdParam) {
      params.set("transactionId", transactionIdParam)
    }

    const queryString = params.toString()

    return queryString
      ? `${gbAppRoutes.mySupportDispute(countryCode)}?${queryString}`
      : gbAppRoutes.mySupportDispute(countryCode)
  }, [countryCode, dealIdParam, transactionIdParam])

  const inquiryHref = useMemo(() => {
    const params = new URLSearchParams()

    if (dealIdParam) {
      params.set("dealId", dealIdParam)
    }

    const participantId = searchParams.get("participantId")

    if (participantId) {
      params.set("participantId", participantId)
    }

    const queryString = params.toString()

    return queryString
      ? `${gbAppRoutes.mySupportInquiry(countryCode)}?${queryString}`
      : gbAppRoutes.mySupportInquiry(countryCode)
  }, [countryCode, dealIdParam, searchParams])

  useEffect(() => {
    if (typeParam === "dispute") {
      router.replace(disputeHref)
    }
  }, [disputeHref, router, typeParam])

  return (
    <div className="flex flex-col gap-4">
      <BbSectionHeader title={cs.title} subtitle={cs.description} />

      {transactionIdParam ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-sm font-semibold text-amber-900">
            {cs.objectionBannerTitle}
          </Text>
          <Text className="mt-1 text-xs leading-relaxed text-amber-800">
            {cs.objectionBannerDescription}
          </Text>
        </div>
      ) : null}

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={cs.searchPlaceholder}
        className="bb-input w-full"
        aria-label={cs.searchPlaceholder}
      />

      {filteredFaq.length === 0 ? (
        <Text className="px-1 text-sm text-[var(--bb-mute)]">
          {cs.noFaqResults}
        </Text>
      ) : (
        <Accordion.Root type="single" collapsible className="flex flex-col">
          {filteredFaq.map((item) => (
            <Accordion.Item
              key={item.id}
              value={item.id}
              className="border-b border-[#F0EEF6]"
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between px-0.5 py-3 text-left text-sm text-[#4a4860]">
                  <span>{item.question}</span>
                  <span className="text-[#c9c6d6] transition-transform [[data-state=open]_&]:rotate-90">
                    ›
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden px-0.5 pb-3 text-sm leading-relaxed text-[var(--bb-mute)]">
                {item.answer}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}

      <LocalizedClientLink href={inquiryHref}>
        <BbButton variant="secondary" fullWidth>
          {cs.inquiryButton}
        </BbButton>
      </LocalizedClientLink>

      <LocalizedClientLink href={disputeHref}>
        <BbButton fullWidth>{cs.disputeButton}</BbButton>
      </LocalizedClientLink>

      <Text className="border-l-2 border-[var(--bb-line)] bg-[#F7F6FB] px-2 py-1 text-xs text-[var(--bb-mute)]">
        {cs.disputeSettlementHoldNotice}
      </Text>
    </div>
  )
}

export default MySupportView
