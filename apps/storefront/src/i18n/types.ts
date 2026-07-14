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
    checkoutButton: string
    checkoutNote: string
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
    summary: string
    goToCheckout: string
    item: string
    price: string
    total: string
    emptyDescription: string
    signInTitle: string
    signInSubtitle: string
    signIn: string
    selectPlaceholder: string
    subtotalExcl: string
    shipping: string
    discount: string
    taxes: string
    totalLabel: string
  }
  checkout: {
    backToCart: string
    back: string
    inYourCart: string
    edit: string
    shippingAddress: string
    billingAddress: string
    contact: string
    billingSameAsShipping: string
    billingSameAsShippingSummary: string
    continueToDelivery: string
    savedAddressPrompt: string
    chooseAddress: string
    delivery: string
    shippingMethod: string
    shippingMethodHint: string
    pickUpOrder: string
    store: string
    chooseStore: string
    method: string
    continueToPayment: string
    payment: string
    paymentMethod: string
    paymentDetails: string
    giftCard: string
    enterCardDetails: string
    enterCardDetailsButton: string
    continueToReview: string
    anotherStepWillAppear: string
    selectPaymentMethod: string
    placeOrder: string
    testBadgeAttention: string
    testBadgeNote: string
    review: string
    reviewDisclaimer: string
    addPromotionCode: string
    apply: string
    promotionsApplied: string
    removeDiscountAria: string
    country: string
    firstName: string
    lastName: string
    address: string
    company: string
    postalCode: string
    city: string
    stateProvince: string
    email: string
    phone: string
    emailValidationTitle: string
    paymentProviders: {
      creditCard: string
      ideal: string
      bancontact: string
      paypal: string
      manual: string
    }
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
