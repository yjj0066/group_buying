import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui"
import { Link } from "react-router-dom"

import { useAdminGroupDeals } from "../../hooks/use-group-deals"
import {
  DEPOSIT_STATUS_LABELS,
  formatDealDate,
  getDepositBadgeColor,
  getParticipationRate,
  GROUP_DEAL_STATUS_LABELS,
} from "../../lib/group-deal"

const GroupDealsPage = () => {
  const { data, isLoading, error } = useAdminGroupDeals()
  const groupDeals = data?.group_deals ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Group Deals</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Manage K-POP group buying campaigns
          </Text>
        </div>
        <Button asChild>
          <Link to="/group-deals/create">Create Group Deal</Link>
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading && <Text>Loading group deals...</Text>}
        {error && (
          <Text className="text-ui-fg-error">
            Failed to load group deals: {error.message}
          </Text>
        )}

        {!isLoading && !error && (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Deposit</Table.HeaderCell>
                <Table.HeaderCell>Participants</Table.HeaderCell>
                <Table.HeaderCell>Deal Price</Table.HeaderCell>
                <Table.HeaderCell>Schedule</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groupDeals.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7}>
                    <Text className="text-ui-fg-subtle">
                      No group deals yet. Create your first campaign.
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )}

              {groupDeals.map((deal) => (
                <Table.Row key={deal.id}>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <Text weight="plus">{deal.title}</Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {deal.id}
                      </Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="small">
                      {GROUP_DEAL_STATUS_LABELS[deal.status] ?? deal.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="small" color={getDepositBadgeColor(deal.deposit_status)}>
                      {DEPOSIT_STATUS_LABELS[deal.deposit_status] ?? deal.deposit_status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {deal.current_participants} / {deal.min_participants}
                    <Text size="small" className="text-ui-fg-subtle">
                      {getParticipationRate(deal)}%
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {deal.deal_price.toLocaleString()} {deal.currency_code}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">
                      {formatDealDate(deal.starts_at)}
                      <br />
                      {formatDealDate(deal.ends_at)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <Button size="small" variant="secondary" asChild>
                      <Link to={`/group-deals/${deal.id}`}>View</Link>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Group Deals",
  icon: Users,
})

export default GroupDealsPage
