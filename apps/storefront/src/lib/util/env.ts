export const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_BASE_URL

  if (url) {
    return url
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000"
  }

  throw new Error("NEXT_PUBLIC_BASE_URL is required in production")
}
