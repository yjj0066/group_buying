export type Dictionary = {
  nav: {
    storeName: string
    allProducts: string
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
  albumShowcase: {
    title: string
    subtitle: string
    dDay: string
    dDayToday: string
    participants: string
    viewDeal: string
  }
  landing: {
    metaTitle: string
    metaDescription: string
    brandName: string
    groupBuyLabel: string
    joinButton: string
    newBadge: string
    spotsLeft: string
    participants: string
    daysLeft: string
    endingInHours: string
    priceDropTitle: string
    targetPrice: string
    currentPrice: string
    stickyCta: string
    nav: {
      groupBuys: string
      searchDeals: string
      categories: string
      whyUs: string
      signIn: string
      myPage: string
      startGroupBuy: string
    }
    hero: {
      eyebrow: string
      headline: string
      subheadline: string
      cta: string
      featuredCta: string
      liveParticipants: string
      weeklyPopularTitle: string
      summaryExpectedPrice: string
      summaryAchievementRate: string
    }
    ticker: {
      joined: string
      waitlist: string
    }
    popular: { title: string; subtitle: string }
    categories: {
      title: string
      all: string
      albums: string
      lightsticks: string
      photocards: string
      dolls: string
      clothing: string
      accessories: string
    }
    grid: { title: string; subtitle: string }
    endingSoon: { title: string; subtitle: string }
    trending: { title: string }
    newlyOpened: { title: string }
    fanFavorites: { title: string }
    viewAll: string
    viewAllDeals: string
    viewAllProducts: string
    demoDataNotice: string
    aiRecommendationsTitle: string
    why: {
      title: string
      authentic: { title: string; description: string }
      lowerPrices: { title: string; description: string }
      secure: { title: string; description: string }
      shipping: { title: string; description: string }
    }
    reviews: {
      title: string
      review1: { quote: string; author: string; group: string }
      review2: { quote: string; author: string; group: string }
      review3: { quote: string; author: string; group: string }
    }
    floating: { live: string; joiningNow: string }
    footer: {
      tagline: string
      explore: string
      support: string
      securePayment: string
      authenticGoods: string
      copyright: string
    }
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
    groupBuyParticipate: string
    demandSurveyParticipate: string
    expectedGroupBuyPrice: string
    msrpLabel: string
    achievementRate: string
    stageBadgeDemandSurvey: string
    stageBadgeRecruiting: string
    stageBadgeProduction: string
    stageBadgeShipping: string
    selectVariant: string
    outOfStock: string
    selectOptions: string
    priceFrom: string
    originalPriceLabel: string
    searchPlaceholder: string
    searchAriaLabel: string
    searchLabel: string
    searchSubmit: string
    searchResultsFor: string
    noSearchResults: string
    aiSearchActive: string
    categoryFilter: string
    allCategories: string
    sortBy: string
    sortLatest: string
    sortPriceAsc: string
    sortPriceDesc: string
    optionsFilter: string
    tabs: {
      productInformation: string
      shippingAndReturns: string
      material: string
      countryOfOrigin: string
      type: string
      weight: string
      dimensions: string
      weightValue: string
      dimensionsValue: string
      notAvailable: string
      fastDelivery: string
      fastDeliveryDescription: string
      simpleExchanges: string
      simpleExchangesDescription: string
      easyReturns: string
      easyReturnsDescription: string
    }
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
    applyButton: string
    checkoutButton: string
    checkoutNote: string
    demoDealNotice: string
    productPreviewNotice: string
    joining: string
    joinError: string
    timeRemaining: string
    listDescription: string
    filtersTitle: string
    searchPlaceholder: string
    filterIdolGroup: string
    filterMember: string
    filterGoodsType: string
    filterPriceRange: string
    filterSort: string
    sortDeadline: string
    sortNewest: string
    filterAll: string
    favoriteMember: string
    favoriteMemberPlaceholder: string
    vacantOnlyToggle: string
    resetFilters: string
    resultsCount: string
    emptyFiltered: string
    emptyFilteredCta: string
    searchMinLengthHint: string
    dealTimelineTitle: string
    dealTimelineStages: {
      created: string
      recruiting: string
      payment: string
      purchasing: string
      shipping: string
      settlement: string
    }
    fixedShippingFeeNotice: string
    seatHoldNotice: string
    seatHoldActive: string
    autoDeliveryConfirmNotice: string
    escrowNoticeTitle: string
    escrowNoticeDescription: string
    leaderTrustTitle: string
    leaderTrustLabels: {
      excellent: string
      good: string
      fair: string
      caution: string
    }
    depositSecuredBadge: string
    depositStatusDeposited: string
    depositStatusPending: string
    receiptVerified: string
    receiptPending: string
    receiptPanelTitle: string
    receiptViewButton: string
    receiptCloseButton: string
    receiptHiddenUntilPurchase: string
    memberSeatsTitle: string
    seatVacant: string
    seatClosed: string
    seatSelectRequired: string
    seatHoldExpired: string
    selectedSeatSummary: string
    cardTrustScore: string
    waitlistButton: string
    waitlistDescription: string
    waitlistSuccess: string
    waitlistSuccessNote: string
    waitlistError: string
    waitlistHint: string
    cardMemberVacancy: string
    cardMemberWaitlist: string
    cardMemberFull: string
    cardWaitlistLabel: string
    cardDaysLeft: string
    cardEndsToday: string
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
    groupDealReservationTitle: string
    groupDealReservationDescription: string
    tossPaymentDescription: string
    tossClientKeyMissing: string
    saveCardDetails: string
    saveCardAndJoin: string
    cardSavedForLater: string
    paymentProviders: {
      creditCard: string
      ideal: string
      bancontact: string
      paypal: string
      manual: string
      tossPayments: string
    }
  }
  sideMenu: {
    home: string
    store: string
    account: string
    cart: string
    copyright: string
  }
  footer: {
    categories: string
    collections: string
    support: string
    customerService: string
    privacyPolicy: string
    termsOfUse: string
    copyright: string
  }
  account: {
    login: {
      title: string
      subtitle: string
      verificationIntro: string
      verificationOutro: string
      notMember: string
      joinUs: string
      submit: string
    }
    register: {
      title: string
      subtitle: string
      verificationIntro: string
      verificationOutro: string
      firstName: string
      lastName: string
      email: string
      phone: string
      password: string
      agreementPrefix: string
      privacyPolicy: string
      agreementMiddle: string
      termsOfUse: string
      agreementSuffix: string
      submit: string
      alreadyMember: string
      signIn: string
      successRedirecting: string
    }
    verify: {
      title: string
      verifying: string
      success: string
      successCta: string
      error: string
      errorCta: string
    }
    layout: {
      helpTitle: string
      helpDescription: string
      customerService: string
    }
    nav: {
      account: string
      overview: string
      profile: string
      addresses: string
      orders: string
      paymentMethods: string
      hostedDeals: string
      participations: string
      settlements: string
      preferences: string
      customerService: string
      logout: string
      hello: string
    }
    dashboard: {
      title: string
      description: string
      roleHint: string
    }
    customerService: {
      title: string
      description: string
      faqTitle: string
      faqItems: string[]
      inquiryTitle: string
      inquiryDescription: string
      disputeTitle: string
      disputeDescription: string
      disputeCta: string
    }
    paymentMethods: {
      title: string
      description: string
      empty: string
      defaultBadge: string
      stripeLabel: string
      tossLabel: string
      deleteButton: string
      deleting: string
      deleteError: string
      addTitle: string
      addDescription: string
      cardLabel: string
      cardLabelPlaceholder: string
      last4Label: string
      addStripe: string
      addToss: string
      addStripeSecure: string
      saveStripeCard: string
      stripeNotConfigured: string
      adding: string
      addError: string
      labelRequired: string
    }
    hostedDeals: {
      title: string
      description: string
      empty: string
      depositSecured: string
      depositPending: string
      adminLink: string
      participants: string
      viewDeal: string
      leaderStage: string
    }
    participations: {
      title: string
      description: string
      tabActive: string
      tabCompleted: string
      tabCancelled: string
      empty: string
      emptyActive: string
      emptyActiveCta: string
      emptyCompleted: string
      emptyCancelled: string
      autoDeliveryConfirmHint: string
      quantity: string
      viewDeal: string
      viewDetail: string
      detailTitle: string
      backToList: string
      progressTitle: string
      trackingTitle: string
      escrowTitle: string
      confirmDeliveryIrreversible: string
      tracking: string
      confirmDelivery: string
      confirmingDelivery: string
      deliveryConfirmed: string
      confirmDeliveryError: string
    }
    settlements: {
      title: string
      description: string
      empty: string
      typeDepositRefund: string
      typeEscrowRelease: string
      typeParticipantRefund: string
      statusCompleted: string
      statusPending: string
      statusFailed: string
      columns: {
        date: string
        deal: string
        type: string
        amount: string
        status: string
      }
    }
    preferences: {
      title: string
      description: string
      favoriteTitle: string
      favoriteDescription: string
      idolGroupLabel: string
      idolGroupPlaceholder: string
      memberLabel: string
      memberPlaceholder: string
      notificationsTitle: string
      notificationsDescription: string
      notifyVacancyLabel: string
      notifyVacancyDescription: string
      notifyProgressLabel: string
      notifyProgressDescription: string
      saveButton: string
      saving: string
      saveSuccess: string
      saveError: string
    }
    groupBuying: {
      stages: {
        recruiting: string
        payment_complete: string
        purchasing: string
        shipping: string
        delivery_confirmed: string
      }
      leaderStages: {
        created: string
        deposit_pending: string
        recruiting: string
        verify_and_order: string
        receive_inspect: string
        shipping: string
        closing: string
        settled: string
      }
    }
    meta: {
      loginTitle: string
      loginDescription: string
      verifyTitle: string
      verifyDescription: string
      paymentMethodsTitle: string
      paymentMethodsDescription: string
      hostedDealsTitle: string
      hostedDealsDescription: string
      participationsTitle: string
      participationsDescription: string
      settlementsTitle: string
      settlementsDescription: string
      preferencesTitle: string
      preferencesDescription: string
    }
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
    displayStages: {
      demand_survey: { label: string; shortLabel: string }
      group_recruitment: { label: string; shortLabel: string }
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
