export type PokaCatchLogoVariant = "light" | "dark"

export const POKACATCH_PURPLE = "#6C4EF6"

export const POKACATCH_PALETTE = {
  light: {
    cardFill: "#FFFFFF",
    cardStroke: POKACATCH_PURPLE,
    innerFill: "#F0EDFF",
    flapFill: "#FFFFFF",
    sparkle: POKACATCH_PURPLE,
    motion: POKACATCH_PURPLE,
    wordmark: "#111827",
  },
  dark: {
    cardFill: "#1E1B28",
    cardStroke: POKACATCH_PURPLE,
    innerFill: "#2F2942",
    flapFill: "#252033",
    sparkle: "#FFFFFF",
    motion: "#8B78F8",
    wordmark: "#FFFFFF",
  },
} as const satisfies Record<PokaCatchLogoVariant, Record<string, string>>
