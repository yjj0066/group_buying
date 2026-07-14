import { Metadata } from "next"

import { listMySettlements } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import SettlementsTable from "@modules/account/components/settlements-table"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.settlementsTitle,
    description: dictionary.account.meta.settlementsDescription,
  }
}

export default async function SettlementsPage() {
  const [dictionary, settlements] = await Promise.all([
    getServerDictionary(),
    listMySettlements(),
  ])

  const t = dictionary.account.settlements

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{t.description}</Text>
      </div>
      <SettlementsTable
        settlements={settlements}
        labels={{
          empty: t.empty,
          typeDepositRefund: t.typeDepositRefund,
          typeEscrowRelease: t.typeEscrowRelease,
          typeParticipantRefund: t.typeParticipantRefund,
          statusCompleted: t.statusCompleted,
          statusPending: t.statusPending,
          statusFailed: t.statusFailed,
          columns: t.columns,
        }}
      />
    </div>
  )
}
