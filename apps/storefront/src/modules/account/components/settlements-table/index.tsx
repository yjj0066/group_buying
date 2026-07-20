import { Badge, Table, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { SettlementRecord, SettlementType } from "types/account-group-deals"

type SettlementsTableProps = {
  settlements: SettlementRecord[]
  labels: {
    empty: string
    typeDepositRefund: string
    typeEscrowRelease: string
    typeParticipantRefund: string
    typeSettlement: string
    typeRefund: string
    typeUnallocatedRefund: string
    typeDepositReturn: string
    typeDepositForfeiture: string
    statusCompleted: string
    statusPending: string
    statusFailed: string
    columns: {
      date: string
      deal: string
      type: string
      amount: string
      status: string
    }
  }
}

const SettlementsTable = ({ settlements, labels }: SettlementsTableProps) => {
  if (!settlements.length) {
    return (
      <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center">
        <Text className="text-ui-fg-subtle">{labels.empty}</Text>
      </div>
    )
  }

  const typeLabel = (type: SettlementType) => {
    switch (type) {
      case "deposit_refund":
        return labels.typeDepositReturn || labels.typeDepositRefund
      case "escrow_release":
        return labels.typeSettlement || labels.typeEscrowRelease
      case "unallocated_refund":
        return labels.typeUnallocatedRefund
      case "deposit_forfeiture":
        return labels.typeDepositForfeiture
      default:
        return labels.typeRefund || labels.typeParticipantRefund
    }
  }

  const statusLabel = (status: SettlementRecord["status"]) => {
    switch (status) {
      case "pending":
        return labels.statusPending
      case "failed":
        return labels.statusFailed
      default:
        return labels.statusCompleted
    }
  }

  const statusColor = (status: SettlementRecord["status"]) => {
    switch (status) {
      case "pending":
        return "orange" as const
      case "failed":
        return "red" as const
      default:
        return "green" as const
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ui-border-base">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>{labels.columns.date}</Table.Head>
            <Table.Head>{labels.columns.deal}</Table.Head>
            <Table.Head>{labels.columns.type}</Table.Head>
            <Table.Head>{labels.columns.amount}</Table.Head>
            <Table.Head>{labels.columns.status}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {settlements.map((record) => (
            <Table.Row key={record.id}>
              <Table.Cell>
                {record.processed_at
                  ? new Date(record.processed_at).toLocaleDateString()
                  : "-"}
              </Table.Cell>
              <Table.Cell>{record.group_deal_title}</Table.Cell>
              <Table.Cell>{typeLabel(record.type)}</Table.Cell>
              <Table.Cell>
                {record.amount != null
                  ? convertToLocale({
                      amount: record.amount,
                      currency_code: record.currency_code,
                    })
                  : "-"}
              </Table.Cell>
              <Table.Cell>
                <Badge color={statusColor(record.status)}>
                  {statusLabel(record.status)}
                </Badge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

export default SettlementsTable
