export const getSiteName = (): string => {
  return process.env.NEXT_PUBLIC_SITE_NAME ?? "공동구매몰"
}
