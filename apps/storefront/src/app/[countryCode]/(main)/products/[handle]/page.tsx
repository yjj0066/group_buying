import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { translateProductFields } from "@lib/util/translate-content"
import { getMedusaLocaleCode, getServerDictionary } from "@i18n/server"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct | undefined,
  selectedVariantId?: string
) {
  if (!product) return []

  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: {
      handle,
      fields: "+description,+thumbnail,",
    },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const dictionary = await getServerDictionary()
  const siteName = dictionary.nav.storeName
  const pageTitle = `${product.title} | ${siteName}`

  return {
    title: pageTitle,
    description: `${product.title}`,
    openGraph: {
      title: pageTitle,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const productFields =
    "+description,*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+thumbnail,+images,+metadata,+tags,"

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: {
      handle: params.handle,
      fields: productFields,
    },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const localeCode = await getMedusaLocaleCode()
  const translatedFields = await translateProductFields(pricedProduct, localeCode)
  const localizedProduct = {
    ...pricedProduct,
    description: translatedFields.description ?? pricedProduct.description,
    material: translatedFields.material ?? pricedProduct.material,
    type: pricedProduct.type
      ? {
          ...pricedProduct.type,
          value: translatedFields.typeValue ?? pricedProduct.type.value,
        }
      : pricedProduct.type,
  }

  const images = getImagesForVariant(localizedProduct, selectedVariantId)

  return (
    <ProductTemplate
      product={localizedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
    />
  )
}
