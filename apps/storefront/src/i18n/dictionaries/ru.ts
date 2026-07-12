import type { Dictionary } from "../types"

const dictionary: Dictionary = {
  nav: {
    storeName: "Совместные покупки",
    groupBuying: "Совместная покупка",
    account: "Аккаунт",
    cart: "Корзина",
    menu: "Меню",
    currencyAriaLabel: "Изменить валюту",
  },
  hero: {
    badge: "Ограниченные совместные покупки",
    title: "Чем больше участников — тем ниже цена",
    subtitle:
      "Присоединяйтесь к лимитированным совместным покупкам: при достижении цели — эксклюзивные скидки и быстрая доставка!",
    cta: "Смотреть совместные покупки",
  },
  products: {
    allProducts: "Все товары",
    products: "Товары",
    homeDescription:
      "Отображаются все опубликованные товары без фильтров.",
    groupBuyingDescription:
      "Показаны все опубликованные товары. Покупайте вместе и экономьте.",
    empty:
      "Нет опубликованных товаров. Опубликуйте товары в Medusa Admin.",
    regionError:
      "Не удалось загрузить регион. Настройте регионы в Medusa Admin.",
    detailDescription: "Подробное описание",
    relatedProducts: "Похожие товары",
    relatedProductsDescription:
      "Возможно, вас также заинтересуют эти товары.",
    addToCart: "В корзину",
    selectVariant: "Выберите вариант",
    outOfStock: "Нет в наличии",
    selectOptions: "Выберите опции",
    priceFrom: "От ",
    originalPriceLabel: "Первоначальная цена: ",
  },
  groupBuying: {
    title: "Совместная покупка",
    backToList: "← К списку совместных покупок",
    discount: "скидка",
    originalPrice: "Первоначальная цена",
    targetAndCurrent: "Цель {target} · участвуют {current}",
    joinTitle: "Участвовать",
    participants: "{current} / {target} участников",
    joinSuccess: "Вы присоединились к совместной покупке!",
    joinSuccessNote:
      "Оплата со скидкой будет произведена после достижения цели.",
    joinClosedFull: "Покупка закрыта — цель достигнута.",
    joinClosedInactive: "Эта совместная покупка сейчас недоступна.",
    email: "Эл. почта",
    quantity: "Количество",
    joinButton: "Присоединиться к покупке",
    joining: "Присоединение...",
    joinError: "Произошла ошибка при присоединении.",
    timeRemaining: "Осталось времени",
  },
  cart: {
    title: "Корзина",
    quantity: "Количество",
    remove: "Удалить",
    subtotal: "Промежуточный итог",
    subtotalNote: "(без налогов)",
    goToCart: "Перейти в корзину",
    empty: "Ваша корзина пуста.",
    explore: "Смотреть товары",
  },
  sideMenu: {
    home: "Главная",
    store: "Магазин",
    account: "Аккаунт",
    cart: "Корзина",
    copyright: "Все права защищены.",
  },
  idol: {
    productionStatus: "Ход производства",
    participationRate: "Участие в реальном времени",
    participationProgress: "{current} / {target} участвуют",
    unlockEvent: "Событие разблокировки бонусов",
    achievementRate: "{rate}% достигнуто",
    milestoneAchieved: "{threshold}% достигнуто",
    unlocked: "РАЗБЛОКИРОВАНО",
    optionSelect: "Выберите {title}",
    stages: {
      demand_survey: { label: "Опрос спроса", shortLabel: "Спрос" },
      pre_deposit: { label: "Предзаказ", shortLabel: "Предзаказ" },
      general_deposit: { label: "Общий депозит", shortLabel: "Депозит" },
      in_production: { label: "В производстве", shortLabel: "Производство" },
      shipping: { label: "Начата доставка", shortLabel: "Доставка" },
    },
    milestones: {
      productionConfirmed: "Производство подтверждено",
      hologramSticker: "Голографический стикер в подарок",
      unreleasedPocaSet: "Специальный набор неопубликованных фотокарточек",
    },
    bonus: {
      preDepositTitle: "Бонус предзаказа: 1 неопубликованная фотокарточка",
      preDepositDescription:
        "Участвуйте в период предзаказа и получите случайную неопубликованную фотокарточку",
      fullSetTitle: "Бонус полного набора: набор без дубликатов",
      fullSetDescription:
        "Выберите все варианты участников для полного набора без повторов",
    },
    demandSurvey: {
      title: "Участие в опросе спроса",
      description:
        "Выразите интерес к этому товару. Когда наберётся достаточно участников, мы перейдём к следующему этапу.",
      clickHint: "Нажмите на этап опроса спроса, чтобы участвовать.",
      joinShort: "Участвовать",
      participateButton: "Участвовать в опросе",
      participating: "Участие...",
      success: "Спасибо! Ваш интерес зарегистрирован.",
      alreadyParticipated: "Вы уже участвовали в этом опросе спроса.",
      error: "Произошла ошибка. Пожалуйста, попробуйте позже.",
      close: "Закрыть",
      emailLabel: "Эл. почта (необязательно)",
      emailPlaceholder: "example@email.com",
      emailOptional: "Оставьте email, чтобы получать новости о производстве.",
    },
  },
}

export default dictionary
