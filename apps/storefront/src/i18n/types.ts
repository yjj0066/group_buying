export type Dictionary = {
  nav: {
    storeName: string
    groupBuying: string
    account: string
    cart: string
    menu: string
    currencyAriaLabel: string
  }
  hero: {
    badge: string
    title: string
    subtitle: string
    cta: string
  }
  products: {
    allProducts: string
    products: string
    homeDescription: string
    groupBuyingDescription: string
    empty: string
    regionError: string
    detailDescription: string
    relatedProducts: string
    relatedProductsDescription: string
    addToCart: string
    selectVariant: string
    outOfStock: string
    selectOptions: string
    priceFrom: string
    originalPriceLabel: string
  }
  groupBuying: {
    title: string
    backToList: string
    discount: string
    originalPrice: string
    targetAndCurrent: string
    joinTitle: string
    participants: string
    joinSuccess: string
    joinSuccessNote: string
    joinClosedFull: string
    joinClosedInactive: string
    email: string
    quantity: string
    joinButton: string
    joining: string
    joinError: string
    timeRemaining: string
  }
  cart: {
    title: string
    quantity: string
    remove: string
    subtotal: string
    subtotalNote: string
    goToCart: string
    empty: string
    explore: string
  }
  sideMenu: {
    home: string
    store: string
    account: string
    cart: string
    copyright: string
  }
  idol: {
    productionStatus: string
    participationRate: string
    participationProgress: string
    unlockEvent: string
    achievementRate: string
    milestoneAchieved: string
    unlocked: string
    optionSelect: string
    stages: {
      demand_survey: { label: string; shortLabel: string }
      pre_deposit: { label: string; shortLabel: string }
      general_deposit: { label: string; shortLabel: string }
      in_production: { label: string; shortLabel: string }
      shipping: { label: string; shortLabel: string }
    }
    milestones: {
      productionConfirmed: string
      hologramSticker: string
      unreleasedPocaSet: string
    }
    bonus: {
      preDepositTitle: string
      preDepositDescription: string
      fullSetTitle: string
      fullSetDescription: string
    }
    demandSurvey: {
      title: string
      description: string
      clickHint: string
      joinShort: string
      participateButton: string
      participating: string
      success: string
      alreadyParticipated: string
      error: string
      close: string
      emailLabel: string
      emailPlaceholder: string
      emailOptional: string
    }
  }
}
