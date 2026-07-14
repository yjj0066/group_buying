import { retrieveGroupDeal } from "@lib/data/group-deals"

import { translateContent } from "@lib/util/translate-content"

import { convertToLocale } from "@lib/util/money"

import { getMedusaLocaleCode, getServerDictionary, formatMessage } from "@i18n/server"

import { Heading, Text } from "@modules/common/components/ui"

import GroupDealProgress from "@modules/group-buying/components/group-deal-progress"
import UnlockRewardGauge from "@modules/products/components/unlock-reward-gauge"

import JoinDealForm from "@modules/group-buying/components/join-deal-form"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { notFound } from "next/navigation"



type GroupDealDetailTemplateProps = {

  id: string

}



const GroupDealDetailTemplate = async ({

  id,

}: GroupDealDetailTemplateProps) => {

  let groupDeal



  try {

    const response = await retrieveGroupDeal(id)

    groupDeal = response.group_deal

  } catch {

    notFound()

  }



  const [dictionary, localeCode] = await Promise.all([
    getServerDictionary(),
    getMedusaLocaleCode(),
  ])

  const [translatedTitle, translatedDescription] = await Promise.all([
    translateContent(groupDeal.title, localeCode),
    translateContent(groupDeal.description, localeCode),
  ])

  const displayTitle = translatedTitle ?? groupDeal.title
  const displayDescription = translatedDescription ?? groupDeal.description



  const discount = Math.round(

    ((groupDeal.original_price - groupDeal.deal_price) /

      groupDeal.original_price) *

      100

  )



  const participantCount = groupDeal.current_participants ?? 0
  const minParticipants = groupDeal.min_participants || groupDeal.target_quantity



  return (

    <div className="content-container py-12">

      <LocalizedClientLink

        href="/group-buying"

        className="text-small-regular text-ui-fg-subtle hover:text-ui-fg-base mb-6 inline-block"

      >

        {dictionary.groupBuying.backToList}

      </LocalizedClientLink>



      <div className="grid grid-cols-1 medium:grid-cols-2 gap-10">

        <div className="flex flex-col gap-y-6">

          <div className="flex flex-col gap-y-2">

            <span className="inline-flex w-fit px-2 py-1 text-xs font-medium bg-ui-tag-green-bg text-ui-tag-green-text rounded">

              {discount}% {dictionary.groupBuying.discount}

            </span>

            <Heading level="h1" className="text-2xl font-semibold">

              {displayTitle}

            </Heading>

            {displayDescription && (

              <Text className="text-ui-fg-subtle">

                {displayDescription}

              </Text>

            )}

          </div>



          <GroupDealProgress deal={groupDeal} />

          <UnlockRewardGauge
            current={groupDeal.current_quantity}
            target={groupDeal.target_quantity}
          />



          <div className="flex flex-col gap-y-2 p-6 border border-ui-border-base rounded-lg">

            <div className="flex justify-between">

              <Text className="text-ui-fg-muted line-through">

                {dictionary.groupBuying.originalPrice}{" "}

                {convertToLocale({

                  amount: groupDeal.original_price,

                  currency_code: groupDeal.currency_code,

                })}

              </Text>

            </div>

            <Text className="text-2xl font-semibold">

              {convertToLocale({

                amount: groupDeal.deal_price,

                currency_code: groupDeal.currency_code,

              })}

            </Text>

            <Text className="text-small-regular text-ui-fg-subtle">

              {formatMessage(dictionary.groupBuying.targetAndCurrent, {

                target: minParticipants,

                current: participantCount,

              })}

            </Text>

          </div>

        </div>



        <div className="flex flex-col gap-y-4">

          <Heading level="h2" className="text-lg font-medium">

            {dictionary.groupBuying.joinTitle}

          </Heading>

          <JoinDealForm deal={groupDeal} />

        </div>

      </div>

    </div>

  )

}



export default GroupDealDetailTemplate

