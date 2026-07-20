import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const nickname = String(req.query.nickname ?? "").trim()

  if (!nickname) {
    res.status(400).json({ message: "nickname is required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: {
      first_name: nickname,
    },
  })

  res.json({
    available: (data?.length ?? 0) === 0,
  })
}
