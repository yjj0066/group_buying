import { Metadata } from "next"
import { notFound } from "next/navigation"

import GroupDealDetailTemplate from "@modules/group-buying/templates/group-deal-detail"
import { retrieveGroupDeal } from "@lib/data/group-deals"

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const params = await props.params

  try {
    const { group_deal: deal } = await retrieveGroupDeal(params.id)

    return {
      title: deal.title,
      description: deal.description ?? undefined,
    }
  } catch {
    return { title: "Group Deal" }
  }
}

export default async function GroupDealDetailPage(props: {
  params: Promise<{ id: string; countryCode: string }>
}) {
  const params = await props.params

  try {
    await retrieveGroupDeal(params.id)
  } catch {
    notFound()
  }

  return <GroupDealDetailTemplate id={params.id} />
}
