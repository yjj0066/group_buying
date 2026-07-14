import "server-only"

import { HttpTypes } from "@medusajs/types"
import { unstable_cache } from "next/cache"

import {
  DEFAULT_UI_LOCALE,
  medusaLocaleToTranslateLang,
  medusaLocaleToUiLocale,
  type UiLocale,
} from "@i18n/config"

const MYMEMORY_MAX_CHUNK_LENGTH = 450

const chunkTextForTranslation = (text: string): string[] => {
  if (text.length <= MYMEMORY_MAX_CHUNK_LENGTH) {
    return [text]
  }

  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      continue
    }

    if (paragraph.length <= MYMEMORY_MAX_CHUNK_LENGTH) {
      chunks.push(paragraph)
      continue
    }

    let remaining = paragraph

    while (remaining.length > MYMEMORY_MAX_CHUNK_LENGTH) {
      chunks.push(remaining.slice(0, MYMEMORY_MAX_CHUNK_LENGTH))
      remaining = remaining.slice(MYMEMORY_MAX_CHUNK_LENGTH)
    }

    if (remaining.trim()) {
      chunks.push(remaining)
    }
  }

  return chunks.length ? chunks : [text]
}

const MYMEMORY_ERROR_PATTERNS = [
  /MYMEMORY WARNING/i,
  /QUERY LENGTH LIMIT/i,
  /INVALID SOURCE LANGUAGE/i,
  /AUTO\/[A-Z]{2,3} IS AN INVALID/i,
  /NEXT AVAILABLE IN/i,
  /USAGELIMITS/i,
  /PLEASE CONTACT/i,
]

const detectSourceLanguage = (text: string): UiLocale | null => {
  if (/[가-힣]/.test(text)) {
    return "ko"
  }

  if (/[А-Яа-яЁё]/.test(text)) {
    return "ru"
  }

  if (/[\u3040-\u30ff]/.test(text)) {
    return "ja"
  }

  if (/[\u4e00-\u9fff]/.test(text)) {
    return "zh"
  }

  if (/[¿¡ñáéíóúü]/i.test(text)) {
    return "es"
  }

  if (/[A-Za-z]{3,}/.test(text)) {
    return "en"
  }

  return null
}

const isTranslationResponseValid = (
  original: string,
  translated: string
): boolean => {
  if (!translated.trim()) {
    return false
  }

  if (MYMEMORY_ERROR_PATTERNS.some((pattern) => pattern.test(translated))) {
    return false
  }

  if (translated.toUpperCase() === original.toUpperCase()) {
    return false
  }

  return true
}

export const shouldTranslateContent = (
  text: string,
  localeCode: string | null
): boolean => {
  if (!text.trim() || !localeCode) {
    return false
  }

  const uiLocale = medusaLocaleToUiLocale(localeCode)

  if (uiLocale === DEFAULT_UI_LOCALE) {
    return false
  }

  const sourceLocale = detectSourceLanguage(text)

  if (sourceLocale && sourceLocale === uiLocale) {
    return false
  }

  return true
}

const translateWithMyMemory = async (
  text: string,
  targetLang: string
): Promise<string> => {
  if (!text.trim()) {
    return text
  }

  const url = new URL("https://api.mymemory.translated.net/get")
  url.searchParams.set("q", text.slice(0, 500))
  url.searchParams.set("langpair", `ko|${targetLang}`)

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    return text
  }

  const data = (await response.json()) as {
    responseData?: { translatedText?: string }
    responseStatus?: number
    quotaFinished?: boolean
  }

  if (data.quotaFinished || data.responseStatus === 429) {
    return text
  }

  const translated = data.responseData?.translatedText?.trim()

  if (!translated || !isTranslationResponseValid(text, translated)) {
    return text
  }

  return translated
}

const getCachedTranslation = unstable_cache(
  async (text: string, targetLang: string) => {
    return translateWithMyMemory(text, targetLang)
  },
  ["content-translation"],
  { revalidate: 60 * 60 * 24 }
)

export const translateContent = async (
  text: string | null | undefined,
  localeCode: string | null
): Promise<string | null> => {
  if (!text?.trim()) {
    return text ?? null
  }

  if (!shouldTranslateContent(text, localeCode)) {
    return text
  }

  const targetLang = medusaLocaleToTranslateLang(localeCode!)
  const chunks = chunkTextForTranslation(text)

  try {
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const translated = await getCachedTranslation(chunk, targetLang)

        if (!isTranslationResponseValid(chunk, translated)) {
          return chunk
        }

        return translated
      })
    )

    return translatedChunks.join(chunks.length > 1 ? "\n\n" : "")
  } catch {
    return text
  }
}

export const translateProductFields = async (
  product: {
    title?: string | null
    description?: string | null
    material?: string | null
    type?: { value?: string | null } | null
  },
  localeCode: string | null
) => {
  const [description, material, typeValue] = await Promise.all([
    translateContent(product.description, localeCode),
    translateContent(product.material, localeCode),
    translateContent(product.type?.value, localeCode),
  ])

  return {
    description: description ?? product.description ?? null,
    material: material ?? product.material ?? null,
    typeValue: typeValue ?? product.type?.value ?? null,
  }
}

/**
 * 카테고리 이름을 선택된 UI 언어로 번역합니다.
 * 상품 설명과 동일하게 MyMemory API를 사용하며, 하위 카테고리도 재귀 처리합니다.
 */
export const translateCategories = async (
  categories: HttpTypes.StoreProductCategory[],
  localeCode: string | null
): Promise<HttpTypes.StoreProductCategory[]> => {
  return Promise.all(
    categories.map((category) => translateCategory(category, localeCode))
  )
}

export const translateCategory = async (
  category: HttpTypes.StoreProductCategory,
  localeCode: string | null
): Promise<HttpTypes.StoreProductCategory> => {
  const [name, description, children, parent] = await Promise.all([
    translateContent(category.name, localeCode),
    translateContent(category.description, localeCode),
    category.category_children?.length
      ? translateCategories(category.category_children, localeCode)
      : Promise.resolve(category.category_children),
    category.parent_category
      ? translateCategory(category.parent_category, localeCode)
      : Promise.resolve(category.parent_category),
  ])

  return {
    ...category,
    name: name ?? category.name,
    description: description ?? category.description,
    category_children: children ?? category.category_children,
    parent_category: parent ?? category.parent_category,
  }
}

/**
 * 상품 옵션 제목과 값을 선택된 UI 언어로 번역합니다.
 */
export const translateProductOptions = async (
  options: HttpTypes.StoreProductOption[],
  localeCode: string | null
): Promise<HttpTypes.StoreProductOption[]> => {
  return Promise.all(
    options.map(async (option) => {
      const [title, values] = await Promise.all([
        translateContent(option.title, localeCode),
        option.values?.length
          ? Promise.all(
              option.values.map(async (value) => {
                const translatedValue = await translateContent(
                  value.value,
                  localeCode
                )

                return {
                  ...value,
                  value: translatedValue ?? value.value,
                }
              })
            )
          : Promise.resolve(option.values),
      ])

      return {
        ...option,
        title: title ?? option.title,
        values: values ?? option.values,
      }
    })
  )
}
