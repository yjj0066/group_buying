/**
 * Medusa backend persists group-buy data to PostgreSQL (Supabase when DATABASE_URL
 * points at Supabase). Mock/sessionStorage fallbacks are opt-in only.
 */
export const isMockFallbackEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === "true"
