"use client"



import { useMemo, useState } from "react"

import { useRouter, useSearchParams } from "next/navigation"



import { useDictionary } from "@i18n/provider"

import { submitSupportDispute } from "@lib/data/support-dispute"

import { gbAppRoutes } from "@lib/wireframe/routes"

import {

  BbAlert,

  BbButton,

  BbCard,

  BbSectionHeader,

} from "@modules/design-system"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { Text } from "@modules/common/components/ui"



type DealOption = {

  dealId: string

  title: string

  participantId: string | null

}



type MySupportDisputeViewProps = {

  countryCode: string

  dealOptions: DealOption[]

  prefilledDealId?: string | null

  prefilledTransactionId?: string | null

}



const MySupportDisputeView = ({

  countryCode,

  dealOptions,

  prefilledDealId = null,

  prefilledTransactionId = null,

}: MySupportDisputeViewProps) => {

  const t = useDictionary()

  const cs = t.account.customerService

  const participationLabels = t.account.participations

  const router = useRouter()

  const searchParams = useSearchParams()



  const queryDealId = searchParams.get("dealId") ?? prefilledDealId ?? ""

  const queryParticipantId = searchParams.get("participantId") ?? ""

  const transactionId =

    searchParams.get("transactionId") ?? prefilledTransactionId ?? ""



  const initialDealId =

    queryDealId ||

    dealOptions.find((option) => option.participantId === queryParticipantId)

      ?.dealId ||

    ""



  const [dealId, setDealId] = useState(initialDealId)

  const [reasonCategory, setReasonCategory] = useState("")

  const [reason, setReason] = useState("")

  const [details, setDetails] = useState("")

  const [submitting, setSubmitting] = useState(false)

  const [success, setSuccess] = useState(false)

  const [error, setError] = useState<string | null>(null)



  const selectedDeal = useMemo(

    () => dealOptions.find((option) => option.dealId === dealId) ?? null,

    [dealId, dealOptions]

  )



  const participantId =

    queryParticipantId || selectedDeal?.participantId || null



  const handleSubmit = async () => {

    if (!dealId) {

      setError(cs.disputeDealRequired)

      return

    }



    const resolvedReason = reason.trim() || reasonCategory.trim()



    if (!resolvedReason) {

      setError(cs.disputeReasonRequired)

      return

    }



    setSubmitting(true)

    setError(null)



    try {

      await submitSupportDispute({

        dealId,

        dealTitle: selectedDeal?.title ?? null,

        participantId,

        transactionId: transactionId || null,

        reason: resolvedReason,

        details: details.trim() || null,

      })

      setSuccess(true)

    } catch {

      setError(cs.disputeError)

    } finally {

      setSubmitting(false)

    }

  }



  if (success) {

    return (

      <div className="flex flex-col gap-4">

        <BbCard padding="md" className="border-[#FDE68A] bg-[#FEF3C7]">

          <Text className="text-sm font-semibold text-[#92400E]">

            {cs.disputeSuccess}

          </Text>

          <Text className="mt-2 text-sm leading-relaxed text-[#92400E]">

            {cs.disputeSuccessSettlementHold}

          </Text>

          {selectedDeal ? (

            <Text className="mt-3 text-xs text-[#9CA3AF]">

              {cs.disputeDealLabel}: {selectedDeal.title}

            </Text>

          ) : null}

        </BbCard>

        <BbButton

          variant="secondary"

          fullWidth

          onClick={() => router.push(gbAppRoutes.mySupport(countryCode))}

        >

          {cs.backToSupport}

        </BbButton>

      </div>

    )

  }



  return (

    <div className="flex flex-col gap-4 pb-8">

      <BbCard padding="md">

        <LocalizedClientLink href={gbAppRoutes.mySupport(countryCode)}>

          <BbButton variant="secondary" size="sm" className="mb-4">

            {cs.backToSupport}

          </BbButton>

        </LocalizedClientLink>



        <BbSectionHeader

          title={cs.disputeTitle}

          subtitle={cs.disputeDescription}

          className="mb-4"

        />



        {transactionId ? (

          <BbAlert variant="warn" className="mb-4">{cs.objectionBannerDescription}</BbAlert>

        ) : null}



        <div className="flex flex-col gap-4">

          <label className="flex flex-col gap-1.5">

            <Text className="text-xs font-semibold text-[#6B7280]">

              {cs.disputeDealLabel}

            </Text>

            <select

              value={dealId}

              onChange={(event) => setDealId(event.target.value)}

              className="bb-input w-full"

              disabled={Boolean(queryDealId && dealOptions.length === 1)}

            >

              <option value="">{cs.disputeDealPlaceholder}</option>

              {dealOptions.map((option) => (

                <option key={option.dealId} value={option.dealId}>

                  {option.title}

                </option>

              ))}

            </select>

          </label>



          <label className="flex flex-col gap-1.5">

            <Text className="text-xs font-semibold text-[#6B7280]">

              {participationLabels.disputeReasonLabel}

            </Text>

            <select

              value={reasonCategory}

              onChange={(event) => setReasonCategory(event.target.value)}

              className="bb-input w-full"

            >

              <option value="">

                {participationLabels.disputeReasonPlaceholder}

              </option>

              {participationLabels.disputeReasonOptions.map((option) => (

                <option key={option} value={option}>

                  {option}

                </option>

              ))}

            </select>

          </label>



          <label className="flex flex-col gap-1.5">

            <Text className="text-xs font-semibold text-[#6B7280]">

              {cs.disputeReasonTextLabel}

            </Text>

            <textarea

              value={reason}

              onChange={(event) => setReason(event.target.value)}

              placeholder={cs.disputeReasonTextPlaceholder}

              rows={4}

              className="bb-input w-full resize-y"

            />

          </label>



          <label className="flex flex-col gap-1.5">

            <Text className="text-xs font-semibold text-[#6B7280]">

              {participationLabels.disputeDetailsLabel}

            </Text>

            <textarea

              value={details}

              onChange={(event) => setDetails(event.target.value)}

              placeholder={participationLabels.disputeDetailsPlaceholder}

              rows={3}

              className="bb-input w-full resize-y"

            />

          </label>



          <Text className="text-xs text-[#9CA3AF]">

            {cs.disputeSettlementHoldNotice}

          </Text>



          {error ? <BbAlert variant="error">{error}</BbAlert> : null}



          <BbButton fullWidth isLoading={submitting} onClick={handleSubmit}>

            {submitting ? cs.disputeSubmitting : cs.disputeSubmit}

          </BbButton>

        </div>

      </BbCard>

    </div>

  )

}



export default MySupportDisputeView

