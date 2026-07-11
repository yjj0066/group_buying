import type { Dictionary } from "../types"

const dictionary: Dictionary = {
  nav: {
    storeName: "Group Buy Mall",
    groupBuying: "Group Buying",
    account: "Account",
    cart: "Cart",
    menu: "Menu",
  },
  hero: {
    badge: "Limited group deals",
    title: "The More We Gather, The Lower the Price",
    subtitle:
      "Join our limited group buys—when the goal is met, enjoy exclusive discounts and fast shipping!",
    cta: "Browse group deals",
  },
  products: {
    allProducts: "All Products",
    products: "Products",
    homeDescription: "All published products are shown without filters.",
    groupBuyingDescription:
      "All published products are listed. Buy together and save more.",
    empty:
      "No published products yet. Please publish products in Medusa Admin.",
    regionError:
      "Could not load region data. Please configure regions in Medusa Admin.",
    detailDescription: "Product Details",
    relatedProducts: "Related products",
    relatedProductsDescription:
      "You might also want to check out these products.",
    addToCart: "Add to cart",
    selectVariant: "Select variant",
    outOfStock: "Out of stock",
    selectOptions: "Select options",
    priceFrom: "From ",
    originalPriceLabel: "Original: ",
  },
  groupBuying: {
    title: "Group Buying",
    backToList: "← Back to group deals",
    discount: "off",
    originalPrice: "Original price",
    targetAndCurrent: "Goal {target} · {current} joined",
    joinTitle: "Join the deal",
    participants: "{current} / {target} joined",
    joinSuccess: "You have joined the group deal!",
    joinSuccessNote:
      "Payment at the discounted price will proceed when the goal is reached.",
    joinClosedFull: "This deal is closed because the goal has been reached.",
    joinClosedInactive: "This group deal is not available right now.",
    email: "Email",
    quantity: "Quantity",
    joinButton: "Join group deal",
    joining: "Joining...",
    joinError: "An error occurred while joining.",
    timeRemaining: "Time remaining",
  },
  cart: {
    title: "Cart",
    quantity: "Quantity",
    remove: "Remove",
    subtotal: "Subtotal",
    subtotalNote: "(excl. taxes)",
    goToCart: "Go to cart",
    empty: "Your shopping bag is empty.",
    explore: "Explore products",
  },
  sideMenu: {
    home: "Home",
    store: "Store",
    account: "Account",
    cart: "Cart",
    copyright: "All rights reserved.",
  },
  idol: {
    productionStatus: "Production Progress",
    participationRate: "Live Participation",
    participationProgress: "{current} / {target} participating",
    unlockEvent: "Bonus Unlock Event",
    achievementRate: "{rate}% achieved",
    milestoneAchieved: "{threshold}% reached",
    unlocked: "UNLOCKED",
    optionSelect: "Select {title}",
    stages: {
      demand_survey: { label: "Interest Check", shortLabel: "Survey" },
      pre_deposit: { label: "Pre-order", shortLabel: "Pre-order" },
      general_deposit: { label: "General Deposit", shortLabel: "Deposit" },
      in_production: { label: "In Production", shortLabel: "Production" },
      shipping: { label: "Shipping Started", shortLabel: "Shipping" },
    },
    milestones: {
      productionConfirmed: "Production confirmed",
      hologramSticker: "Hologram sticker bonus",
      unreleasedPocaSet: "Unreleased photocard special set",
    },
    bonus: {
      preDepositTitle: "Pre-order bonus: 1 unreleased photocard",
      preDepositDescription:
        "Join during pre-order to receive a random unreleased photocard",
      fullSetTitle: "Full set bonus: non-duplicate photocard set",
      fullSetDescription:
        "Select all member options for a complete set with no duplicates",
    },
    demandSurvey: {
      title: "Join the interest check",
      description:
        "Show your interest in this merchandise. When enough people join, we move to the next stage.",
      clickHint: "Tap the interest check step to participate.",
      joinShort: "Join",
      participateButton: "Join interest check",
      participating: "Joining...",
      success: "Thank you! Your interest has been recorded.",
      alreadyParticipated: "You have already joined this interest check.",
      error: "Something went wrong. Please try again shortly.",
      close: "Close",
      emailLabel: "Email (optional)",
      emailPlaceholder: "example@email.com",
      emailOptional: "Leave your email to receive production updates.",
    },
  },
}

export default dictionary
