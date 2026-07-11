import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const SUPPORTED_LOCALES = [
  "ko-KR",
  "en-US",
  "es-ES",
  "ru-RU",
  "zh-CN",
  "ja-JP",
]

export default async function seedLocales({ container }: ExecArgs) {
  const storeModule = container.resolve(Modules.STORE)

  const [store] = await storeModule.listStores(
    {},
    {
      select: ["id"],
      take: 1,
    }
  )

  if (!store) {
    console.log("No store found. Skipping locale seed.")
    return
  }

  await storeModule.updateStores(store.id, {
    supported_locales: SUPPORTED_LOCALES.map((locale_code) => ({
      locale_code,
    })),
  })

  console.log(`Store locales updated: ${SUPPORTED_LOCALES.join(", ")}`)
}
