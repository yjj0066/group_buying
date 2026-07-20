import { redirect } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"

type Props = {
  params: Promise<{ countryCode: string; participantId: string }>
}

export default async function MyParticipationDetailRedirectPage(props: Props) {
  const { countryCode, participantId } = await props.params

  redirect(gbAppRoutes.participationDetail(countryCode, participantId))
}
