import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Badge, Button, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { AccountGroupDeal } from "types/account-group-deals"
import { isDepositSecuredStatus } from "types/account-group-deals"

type HostedDealsListProps = {
  deals: AccountGroupDeal[]
  adminBaseUrl: string
  labels: {
    empty: string
    depositSecured: string
    depositPending: string
    adminLink: string
    participants: string
    viewDeal: string
    leaderStage: string
    leaderStages: Record<AccountGroupDeal["leader_stage"], string>
  }
}

const HostedDealsList = ({
  deals,
  adminBaseUrl,
  labels,
}: HostedDealsListProps) => {
  if (!deals.length) {
    return (
      <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center">
        <Text className="text-ui-fg-subtle">{labels.empty}</Text>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {deals.map((deal) => {
        const depositSecured = isDepositSecuredStatus(deal.deposit_status)

        return (
          <li
            key={deal.id}
            className="rounded-xl border border-ui-border-base p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Text className="text-lg font-semibold">{deal.title}</Text>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={depositSecured ? "green" : "orange"}>
                    {depositSecured
                      ? labels.depositSecured
                      : labels.depositPending}
                  </Badge>
                  {deal.deposit_amount != null && (
                    <Text className="text-xs text-ui-fg-subtle">
                      {convertToLocale({
                        amount: deal.deposit_amount,
                        currency_code: deal.currency_code,
                      })}
                    </Text>
                  )}
                </div>
                <Text className="text-sm text-ui-fg-subtle">
                  {labels.participants.replace(
                    "{count}",
                    String(deal.current_participants)
                  )}
                </Text>
                <Text className="text-xs text-ui-fg-subtle">
                  {labels.leaderStage}:{" "}
                  {labels.leaderStages[deal.leader_stage ?? "created"]}
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <LocalizedClientLink href={`/group-buying/${deal.id}`}>
                  <Button variant="secondary" size="small">
                    {labels.viewDeal}
                  </Button>
                </LocalizedClientLink>
                <a
                  href={`${adminBaseUrl}/group-deals/${deal.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="transparent" size="small">
                    {labels.adminLink}
                  </Button>
                </a>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default HostedDealsList
