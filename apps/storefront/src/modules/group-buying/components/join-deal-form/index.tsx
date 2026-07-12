"use client"



import { useState } from "react"

import { useRouter } from "next/navigation"

import { Button, Input, Label, Text } from "@modules/common/components/ui"

import { joinGroupDeal } from "@lib/data/group-deals"

import { useDictionary } from "@i18n/provider"

import { GroupDeal } from "types/group-deal"



type JoinDealFormProps = {

  deal: GroupDeal

}



const JoinDealForm = ({ deal }: JoinDealFormProps) => {

  const router = useRouter()

  const t = useDictionary()

  const [email, setEmail] = useState("")

  const [quantity, setQuantity] = useState(1)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [success, setSuccess] = useState(false)



  const isActive = deal.status === "active"

  const isFull = deal.current_quantity >= deal.target_quantity



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    setLoading(true)

    setError(null)



    try {

      await joinGroupDeal(deal.id, { email, quantity })

      setSuccess(true)

      router.refresh()

    } catch (err) {

      setError(

        err instanceof Error ? err.message : t.groupBuying.joinError

      )

    } finally {

      setLoading(false)

    }

  }



  if (success) {

    return (

      <div className="p-6 border border-ui-tag-green-border bg-ui-tag-green-bg rounded-lg">

        <Text className="text-ui-tag-green-text font-medium">

          {t.groupBuying.joinSuccess}

        </Text>

        <Text className="text-small-regular text-ui-fg-subtle mt-2">

          {t.groupBuying.joinSuccessNote}

        </Text>

      </div>

    )

  }



  if (!isActive || isFull) {

    return (

      <div className="p-6 border border-ui-border-base bg-ui-bg-subtle rounded-lg">

        <Text className="text-ui-fg-subtle">

          {isFull

            ? t.groupBuying.joinClosedFull

            : t.groupBuying.joinClosedInactive}

        </Text>

      </div>

    )

  }



  return (

    <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">

      <div className="flex flex-col gap-y-2">

        <Label htmlFor="email">{t.groupBuying.email}</Label>

        <Input

          id="email"

          type="email"

          required

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          placeholder="your@email.com"

        />

      </div>



      <div className="flex flex-col gap-y-2">

        <Label htmlFor="quantity">{t.groupBuying.quantity}</Label>

        <Input

          id="quantity"

          type="number"

          min={1}

          max={10}

          required

          value={quantity}

          onChange={(e) => setQuantity(Number(e.target.value))}

        />

      </div>



      {error && (

        <Text className="text-small-regular text-ui-fg-error">{error}</Text>

      )}



      <Button type="submit" disabled={loading} className="w-full">

        {loading ? t.groupBuying.joining : t.groupBuying.joinButton}

      </Button>

    </form>

  )

}



export default JoinDealForm

