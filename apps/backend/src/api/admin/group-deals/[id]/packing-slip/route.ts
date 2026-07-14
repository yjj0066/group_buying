import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  buildGroupDealPackingSlip,
  packingSlipToCsv,
} from "../../../../../utils/group-deal-leader-ops"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const format = String(req.query.format ?? "json").toLowerCase()
  const packingSlip = await buildGroupDealPackingSlip(req.scope, req.params.id)

  if (format === "csv") {
    const csv = packingSlipToCsv(packingSlip)
    const filename = `packing-slip-${req.params.id}.csv`

    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    )

    res.send(csv)
    return
  }

  res.json({ packing_slip: packingSlip })
}
