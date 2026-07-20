export const buildTrackingUrl = (
  carrier: string | null,
  trackingNumber: string
): string => {
  const normalizedCarrier = (carrier ?? "").toLowerCase()

  if (
    normalizedCarrier.includes("cj") ||
    normalizedCarrier.includes("대한통운")
  ) {
    return `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(trackingNumber)}`
  }

  if (normalizedCarrier.includes("hanjin") || normalizedCarrier.includes("한진")) {
    return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${encodeURIComponent(trackingNumber)}`
  }

  if (normalizedCarrier.includes("lotte") || normalizedCarrier.includes("롯데")) {
    return `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${encodeURIComponent(trackingNumber)}`
  }

  const query = encodeURIComponent(
    `${carrier ?? ""} ${trackingNumber} 배송조회`.trim()
  )

  return `https://www.google.com/search?q=${query}`
}
