import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import {
  useAdminProductsForGroupDeal,
  useCreateGroupDeal,
} from "../../../hooks/use-group-deals"
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../../../lib/group-deal"
import { GroupDealStatus } from "../../../../types/group-buying"

const defaultStartsAt = () => toDateTimeLocalValue(new Date().toISOString())

const defaultEndsAt = () => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return toDateTimeLocalValue(date.toISOString())
}

const GroupDealCreatePage = () => {
  const navigate = useNavigate()
  const { data: products = [], isLoading: productsLoading } =
    useAdminProductsForGroupDeal()
  const { mutateAsync, isPending } = useCreateGroupDeal()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [productId, setProductId] = useState("")
  const [variantId, setVariantId] = useState("")
  const [minParticipants, setMinParticipants] = useState("10")
  const [targetQuantity, setTargetQuantity] = useState("100")
  const [maxQuantity, setMaxQuantity] = useState("100")
  const [originalPrice, setOriginalPrice] = useState("")
  const [dealPrice, setDealPrice] = useState("")
  const [currencyCode, setCurrencyCode] = useState("KRW")
  const [startsAt, setStartsAt] = useState(defaultStartsAt)
  const [endsAt, setEndsAt] = useState(defaultEndsAt)
  const [status, setStatus] = useState<GroupDealStatus>(GroupDealStatus.OPEN)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId]
  )

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId)

    const product = products.find((item) => item.id === nextProductId)
    const firstVariant = product?.variants?.[0]

    if (!firstVariant) {
      setVariantId("")
      return
    }

    setVariantId(firstVariant.id)

    const krwPrice = firstVariant.prices?.find(
      (price) => price.currency_code.toLowerCase() === currencyCode.toLowerCase()
    )

    if (krwPrice) {
      setOriginalPrice(String(krwPrice.amount))
      if (!dealPrice) {
        setDealPrice(String(krwPrice.amount))
      }
    }
  }

  const handleVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId)

    const variant = selectedProduct?.variants?.find(
      (item) => item.id === nextVariantId
    )
    const price = variant?.prices?.find(
      (item) => item.currency_code.toLowerCase() === currencyCode.toLowerCase()
    )

    if (price) {
      setOriginalPrice(String(price.amount))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await mutateAsync({
        title,
        description: description || null,
        product_id: productId,
        variant_id: variantId || null,
        min_participants: Number(minParticipants),
        target_quantity: Number(targetQuantity),
        max_quantity: Number(maxQuantity),
        original_price: Number(originalPrice),
        deal_price: Number(dealPrice),
        currency_code: currencyCode,
        starts_at: fromDateTimeLocalValue(startsAt),
        ends_at: fromDateTimeLocalValue(endsAt),
        status,
      })

      toast.success("Group deal created")
      navigate(`/group-deals/${response.group_deal.id}`)
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create group deal"
      )
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Create Group Deal</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Link a product and configure campaign goals
          </Text>
        </div>
        <Button variant="secondary" asChild>
          <Link to="/group-deals">Back to list</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Product</Label>
            <Select
              value={productId}
              onValueChange={handleProductChange}
              disabled={productsLoading}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select product" />
              </Select.Trigger>
              <Select.Content>
                {products.map((product) => (
                  <Select.Item key={product.id} value={product.id}>
                    {product.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Variant</Label>
            <Select
              value={variantId}
              onValueChange={handleVariantChange}
              disabled={!selectedProduct}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select variant" />
              </Select.Trigger>
              <Select.Content>
                {selectedProduct?.variants?.map((variant) => (
                  <Select.Item key={variant.id} value={variant.id}>
                    {variant.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Minimum Participants</Label>
            <Input
              type="number"
              min={1}
              value={minParticipants}
              onChange={(event) => setMinParticipants(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Target Quantity</Label>
            <Input
              type="number"
              min={1}
              value={targetQuantity}
              onChange={(event) => setTargetQuantity(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Max Quantity</Label>
            <Input
              type="number"
              min={1}
              value={maxQuantity}
              onChange={(event) => setMaxQuantity(event.target.value)}
              required
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
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Original Price</Label>
            <Input
              type="number"
              min={1}
              value={originalPrice}
              onChange={(event) => setOriginalPrice(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Deal Price</Label>
            <Input
              type="number"
              min={1}
              value={dealPrice}
              onChange={(event) => setDealPrice(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Currency</Label>
            <Input
              value={currencyCode}
              onChange={(event) =>
                setCurrencyCode(event.target.value.toUpperCase())
              }
              maxLength={3}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Starts At</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Ends At</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link to="/group-deals">Cancel</Link>
          </Button>
          <Button type="submit" isLoading={isPending}>
            Create Group Deal
          </Button>
        </div>
      </form>
    </Container>
  )
}

export default GroupDealCreatePage
