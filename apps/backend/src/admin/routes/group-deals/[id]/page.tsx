import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  useAdminGroupDeal,
  useCancelGroupDeal,
  useDeleteGroupDeal,
  useUpdateGroupDeal,
} from "../../../hooks/use-group-deals"
import {
  formatDealDate,
  fromDateTimeLocalValue,
  getParticipationRate,
  GROUP_DEAL_STATUS_LABELS,
  toDateTimeLocalValue,
} from "../../../lib/group-deal"
import { GroupDealStatus } from "../../../../types/group-buying"

const GroupDealDetailPage = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()

  const { data, isLoading, error } = useAdminGroupDeal(id)
  const { mutateAsync: updateDeal, isPending: isUpdating } =
    useUpdateGroupDeal(id)
  const { mutateAsync: cancelDeal, isPending: isCancelling } =
    useCancelGroupDeal(id)
  const { mutateAsync: deleteDeal, isPending: isDeleting } = useDeleteGroupDeal()

  const deal = data?.group_deal

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [minParticipants, setMinParticipants] = useState("1")
  const [targetQuantity, setTargetQuantity] = useState("1")
  const [maxQuantity, setMaxQuantity] = useState("1")
  const [originalPrice, setOriginalPrice] = useState("")
  const [dealPrice, setDealPrice] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [status, setStatus] = useState<GroupDealStatus>(GroupDealStatus.DRAFT)

  useEffect(() => {
    if (!deal) {
      return
    }

    setTitle(deal.title)
    setDescription(deal.description ?? "")
    setMinParticipants(String(deal.min_participants))
    setTargetQuantity(String(deal.target_quantity))
    setMaxQuantity(String(deal.max_quantity ?? deal.target_quantity))
    setOriginalPrice(String(deal.original_price))
    setDealPrice(String(deal.deal_price))
    setStartsAt(toDateTimeLocalValue(deal.starts_at))
    setEndsAt(toDateTimeLocalValue(deal.ends_at))
    setStatus(deal.status as GroupDealStatus)
  }, [deal])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await updateDeal({
        title,
        description: description || null,
        min_participants: Number(minParticipants),
        target_quantity: Number(targetQuantity),
        max_quantity: Number(maxQuantity),
        original_price: Number(originalPrice),
        deal_price: Number(dealPrice),
        starts_at: fromDateTimeLocalValue(startsAt),
        ends_at: fromDateTimeLocalValue(endsAt),
        status,
      })

      toast.success("Group deal updated")
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update group deal"
      )
    }
  }

  const handleCancelDeal = async () => {
    const confirmed = await prompt({
      title: "Cancel group deal",
      description:
        "This will stop new participation and mark the deal as cancelled.",
      confirmText: "Cancel deal",
      cancelText: "Keep deal",
    })

    if (!confirmed) {
      return
    }

    try {
      await cancelDeal({ reason: "Cancelled by admin" })
      toast.success("Group deal cancelled")
    } catch (cancelError) {
      toast.error(
        cancelError instanceof Error
          ? cancelError.message
          : "Failed to cancel group deal"
      )
    }
  }

  const handleDeleteDeal = async () => {
    const confirmed = await prompt({
      title: "Delete group deal",
      description:
        "Only draft deals without participants can be deleted. This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Keep deal",
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteDeal(id)
      toast.success("Group deal deleted")
      navigate("/group-deals")
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete group deal"
      )
    }
  }

  if (isLoading) {
    return (
      <Container className="p-6">
        <Text>Loading group deal...</Text>
      </Container>
    )
  }

  if (error || !deal) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-error">
          {error?.message ?? "Group deal not found"}
        </Text>
      </Container>
    )
  }

  const canDelete =
    deal.status === GroupDealStatus.DRAFT && deal.current_participants === 0
  const canCancel =
    deal.status !== GroupDealStatus.CANCELLED &&
    deal.status !== GroupDealStatus.CLOSED

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">{deal.title}</Heading>
            <Badge size="small">
              {GROUP_DEAL_STATUS_LABELS[deal.status] ?? deal.status}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {deal.id} · {getParticipationRate(deal)}% participation
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link to="/group-deals">Back</Link>
          </Button>
          {canCancel && (
            <Button
              variant="danger"
              onClick={handleCancelDeal}
              isLoading={isCancelling}
            >
              Cancel Deal
            </Button>
          )}
          {canDelete && (
            <Button
              variant="danger"
              onClick={handleDeleteDeal}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Heading level="h2">Campaign Settings</Heading>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Minimum Participants</Label>
              <Input
                type="number"
                min={1}
                value={minParticipants}
                onChange={(e) => setMinParticipants(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Target Quantity</Label>
              <Input
                type="number"
                min={1}
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Max Quantity</Label>
              <Input
                type="number"
                min={1}
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as GroupDealStatus)}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={GroupDealStatus.DRAFT}>Draft</Select.Item>
                  <Select.Item value={GroupDealStatus.OPEN}>Open</Select.Item>
                  <Select.Item value={GroupDealStatus.MINIMUM_REACHED}>
                    Minimum Reached
                  </Select.Item>
                  <Select.Item value={GroupDealStatus.CANCELLED}>
                    Cancelled
                  </Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Original Price</Label>
              <Input
                type="number"
                min={1}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Deal Price</Label>
              <Input
                type="number"
                min={1}
                value={dealPrice}
                onChange={(e) => setDealPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Starts At</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Ends At</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <Heading level="h2">Overview</Heading>
          <div className="rounded-lg border p-4">
            <Text size="small" className="text-ui-fg-subtle">
              Product
            </Text>
            <Text weight="plus">{deal.product_id}</Text>
            <Text size="small" className="text-ui-fg-subtle mt-3">
              Variant
            </Text>
            <Text>{deal.variant_id ?? "—"}</Text>
            <Text size="small" className="text-ui-fg-subtle mt-3">
              Participants
            </Text>
            <Text>
              {deal.current_participants} / {deal.min_participants}
            </Text>
            <Text size="small" className="text-ui-fg-subtle mt-3">
              Quantity
            </Text>
            <Text>
              {deal.current_quantity} / {deal.max_quantity ?? deal.target_quantity}
            </Text>
            <Text size="small" className="text-ui-fg-subtle mt-3">
              Schedule
            </Text>
            <Text size="small">{formatDealDate(deal.starts_at)}</Text>
            <Text size="small">{formatDealDate(deal.ends_at)}</Text>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <Heading level="h2" className="mb-4">
          Participants
        </Heading>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell>Reserved</Table.HeaderCell>
              <Table.HeaderCell>Captured</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(deal.participants ?? []).length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text className="text-ui-fg-subtle">No participants yet.</Text>
                </Table.Cell>
              </Table.Row>
            )}

            {(deal.participants ?? []).map((participant) => (
              <Table.Row key={participant.id}>
                <Table.Cell>{participant.email}</Table.Cell>
                <Table.Cell>
                  <Badge size="small">{participant.status}</Badge>
                </Table.Cell>
                <Table.Cell>{participant.quantity}</Table.Cell>
                <Table.Cell>
                  {participant.reserved_at
                    ? formatDealDate(participant.reserved_at)
                    : "—"}
                </Table.Cell>
                <Table.Cell>
                  {participant.captured_at
                    ? formatDealDate(participant.captured_at)
                    : "—"}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export default GroupDealDetailPage
