"use client"

import { useEffect, useMemo, useState } from "react"

import { useDictionary, formatMessage } from "@i18n/provider"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import { Text } from "@modules/common/components/ui"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const t = useDictionary()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const tabs = useMemo(
    () => [
      {
        label: t.products.tabs.productInformation,
        component: <ProductInfoTab product={product} />,
      },
      {
        label: t.products.tabs.shippingAndReturns,
        component: <ShippingInfoTab />,
      },
    ],
    [product, t]
  )

  if (!mounted) {
    return (
      <div className="w-full" aria-hidden="true">
        {tabs.map((tab) => (
          <div
            key={tab.label}
            className="border-grey-20 border-t py-3 last:border-b"
          >
            <Text className="text-ui-fg-subtle text-sm">{tab.label}</Text>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          <Accordion.Item
            key={tab.label}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const t = useDictionary()
  const unavailable = t.products.tabs.notAvailable

  const weightLabel = product.weight
    ? formatMessage(t.products.tabs.weightValue, {
        weight: String(product.weight),
      })
    : unavailable

  const dimensionsLabel =
    product.length && product.width && product.height
      ? formatMessage(t.products.tabs.dimensionsValue, {
          length: String(product.length),
          width: String(product.width),
          height: String(product.height),
        })
      : unavailable

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-2 gap-x-8">
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{t.products.tabs.material}</span>
            <p>{product.material ? product.material : unavailable}</p>
          </div>
          <div>
            <span className="font-semibold">
              {t.products.tabs.countryOfOrigin}
            </span>
            <p>{product.origin_country ? product.origin_country : unavailable}</p>
          </div>
          <div>
            <span className="font-semibold">{t.products.tabs.type}</span>
            <p>{product.type ? product.type.value : unavailable}</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{t.products.tabs.weight}</span>
            <p>{weightLabel}</p>
          </div>
          <div>
            <span className="font-semibold">{t.products.tabs.dimensions}</span>
            <p>{dimensionsLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  const t = useDictionary()

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">
              {t.products.tabs.fastDelivery}
            </span>
            <p className="max-w-sm">
              {t.products.tabs.fastDeliveryDescription}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">
              {t.products.tabs.simpleExchanges}
            </span>
            <p className="max-w-sm">
              {t.products.tabs.simpleExchangesDescription}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">{t.products.tabs.easyReturns}</span>
            <p className="max-w-sm">
              {t.products.tabs.easyReturnsDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
