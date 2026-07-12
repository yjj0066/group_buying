import { Metadata } from "next"

import GroupDealDetailTemplate from "@modules/group-buying/templates/group-deal-detail"

import { getServerDictionary } from "@i18n/server"



export async function generateMetadata(): Promise<Metadata> {

  const dictionary = await getServerDictionary()



  return {

    title: dictionary.groupBuying.title,

  }

}



export default async function GroupDealDetailPage(props: {

  params: Promise<{ id: string }>

}) {

  const params = await props.params



  return <GroupDealDetailTemplate id={params.id} />

}

