import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveGroupDeal } from "@lib/data/group-deals"
import { getServerDictionary } from "@i18n/server"
import VirtualAccountDeposit from "@modules/group-buying/components/virtual-account-deposit"
import { Container, Heading } from "@modules/common/components/ui"

type Props = {
  params: Promise<{ id: string; countryCode: string }>
  searchParams: Promise<{ participant?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.groupBuying.depositPageTitle,
  }
}

export default async function GroupDealDepositPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const participantId = searchParams.participant

  if (!participantId) {
    notFound()
  }

  const dictionary = await getServerDictionary()
  const { group_deal: deal } = await retrieveGroupDeal(params.id)

  return (
    <Container className="py-10">
      <Heading level="h1" className="mb-8 text-2xl">
        {dictionary.groupBuying.depositPageTitle}
      </Heading>
      <div className="mx-auto max-w-lg">
        <VirtualAccountDeposit
          dealTitle={deal.title}
          dealId={deal.id}
          participantId={participantId}
        />
      </div>
    </Container>
  )
}
