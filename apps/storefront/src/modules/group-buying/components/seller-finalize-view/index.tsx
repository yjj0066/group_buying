"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import {
  buildOrderListCsv,
  computeLeaderFinalizeData,
  downloadCsvFile,
} from "@lib/util/leader-order-finalize"
import { convertToLocale } from "@lib/util/money"
import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  BbAlert,
  BbButton,
  BbKpiGrid,
  BbSectionHeader,
  BbTable,
} from "@modules/design-system"
import type { GroupDeal } from "types/group-deal"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

type SellerFinalizeViewProps = {
  deal: GroupDeal
  participations: LeaderDealParticipation[]
}

const SellerFinalizeView = ({
  deal,
  participations,
}: SellerFinalizeViewProps) => {
  const t = useDictionary()
  const finalize = t.account.hostedDeals.finalize
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const finalizeData = useMemo(
    () => computeLeaderFinalizeData(deal, participations),
    [deal, participations]
  )

  const { summary, optionRows, shippingRows } = finalizeData

  const formatAmount = (amount: number) =>
    convertToLocale({
      amount,
      currency_code: deal.currency_code,
    })

  const handleDownloadCsv = () => {
    const csv = buildOrderListCsv(
      deal.title,
      summary,
      optionRows,
      shippingRows,
      {
        dealTitle: finalize.csvDealTitle,
        participantCount: finalize.csvParticipantCount,
        totalQuantity: finalize.csvTotalQuantity,
        totalDeposited: finalize.csvTotalDeposited,
        optionTableTitle: finalize.optionTableTitle,
        optionColumn: finalize.optionColumn,
        quantityColumn: finalize.quantityColumn,
        totalRow: finalize.totalRow,
        shippingTableTitle: finalize.shippingTableTitle,
        nameColumn: finalize.nameColumn,
        phoneColumn: finalize.phoneColumn,
        memberColumn: finalize.memberColumn,
        quantityColumnShort: finalize.quantityColumn,
        addressColumn: finalize.addressColumn,
      }
    )

    downloadCsvFile(`order-list-${deal.id}.csv`, csv)
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <LocalizedClientLink href={gbAppRoutes.sellerRecruitment(countryCode, deal.id)}>
        <BbButton variant="secondary" size="sm">
          {finalize.backToRecruitment}
        </BbButton>
      </LocalizedClientLink>

      <BbSectionHeader title={finalize.title} subtitle={deal.title} />

      {summary.participantCount === 0 ? (
        <BbAlert variant="info">{finalize.emptyParticipants}</BbAlert>
      ) : null}

      <section className="flex flex-col gap-3">
        <BbSectionHeader title={finalize.summaryTitle} className="mb-0" />
        <BbKpiGrid
          columns={3}
          items={[
            {
              label: finalize.confirmedParticipants,
              value: String(summary.participantCount),
            },
            {
              label: finalize.totalQuantity,
              value: String(summary.totalQuantity),
            },
            {
              label: finalize.totalDeposited,
              value: formatAmount(summary.totalDepositedAmount),
            },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <BbSectionHeader title={finalize.optionTableTitle} className="mb-0" />
        <BbTable
          columns={[finalize.optionColumn, finalize.quantityColumn]}
          rows={[
            ...optionRows.map((row) => [row.label, String(row.quantity)]),
            [finalize.totalRow, String(summary.totalQuantity)],
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <BbSectionHeader title={finalize.shippingTableTitle} className="mb-0" />
        <BbTable
          columns={[
            finalize.nameColumn,
            finalize.phoneColumn,
            finalize.memberColumn,
            finalize.quantityColumn,
            finalize.addressColumn,
          ]}
          rows={shippingRows.map((row) => [
            row.recipientName,
            row.phone,
            row.memberLabel,
            String(row.quantity),
            row.address,
          ])}
        />
      </section>

      <BbButton
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={handleDownloadCsv}
        data-testid="leader-finalize-download-csv"
      >
        {finalize.downloadCsv}
      </BbButton>

      <BbButton
        variant="cta"
        fullWidth
        disabled={summary.participantCount === 0}
        onClick={() =>
          router.push(gbAppRoutes.sellerPurchaseProof(countryCode, deal.id))
        }
        data-testid="leader-finalize-proceed-purchase"
      >
        {finalize.proceedPurchase}
      </BbButton>
    </div>
  )
}

export default SellerFinalizeView
