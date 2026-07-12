import type { Dictionary } from "../types"

const dictionary: Dictionary = {
  nav: {
    storeName: "共同購入モール",
    groupBuying: "共同購入",
    account: "アカウント",
    cart: "カート",
    menu: "メニュー",
    currencyAriaLabel: "通貨を変更",
  },
  hero: {
    badge: "限定共同購入",
    title: "集まれば集まるほど、特別価格に",
    subtitle:
      "目標人数達成で特別割引価格・スピード配送の限定共同購入に今すぐ参加しましょう！",
    cta: "共同購入を見る",
  },
  products: {
    allProducts: "すべての商品",
    products: "商品",
    homeDescription:
      "公開済みの商品がすべて表示されます。",
    groupBuyingDescription:
      "公開済みの商品がすべて表示されます。一緒に購入してお得に。",
    empty:
      "公開済みの商品がありません。Medusa Admin で商品を公開してください。",
    regionError:
      "リージョン情報を読み込めませんでした。Medusa Admin でリージョンを設定してください。",
    detailDescription: "詳細説明",
    relatedProducts: "関連商品",
    relatedProductsDescription: "こちらの商品もご覧ください。",
    addToCart: "カートに追加",
    selectVariant: "バリエーションを選択",
    outOfStock: "在庫切れ",
    selectOptions: "オプションを選択",
    priceFrom: "最低 ",
    originalPriceLabel: "定価: ",
  },
  groupBuying: {
    title: "共同購入",
    backToList: "← 共同購入一覧へ",
    discount: "割引",
    originalPrice: "定価",
    targetAndCurrent: "目標 {target} 名 · 現在 {current} 名参加",
    joinTitle: "参加する",
    participants: "{current} / {target} 名参加",
    joinSuccess: "共同購入への参加が完了しました！",
    joinSuccessNote: "目標人数達成後、割引価格で決済が行われます。",
    joinClosedFull: "目標人数に達したため、参加は終了しました。",
    joinClosedInactive: "現在参加できない共同購入です。",
    email: "メールアドレス",
    quantity: "数量",
    joinButton: "共同購入に参加",
    joining: "参加中...",
    joinError: "参加中にエラーが発生しました。",
    timeRemaining: "残り時間",
  },
  cart: {
    title: "カート",
    quantity: "数量",
    remove: "削除",
    subtotal: "小計",
    subtotalNote: "（税抜）",
    goToCart: "カートへ移動",
    empty: "カートは空です。",
    explore: "商品を見る",
  },
  sideMenu: {
    home: "ホーム",
    store: "ストア",
    account: "アカウント",
    cart: "カート",
    copyright: "All rights reserved.",
  },
  idol: {
    productionStatus: "制作進行状況",
    participationRate: "リアルタイム参加率",
    participationProgress: "{current} / {target} 人参加中",
    unlockEvent: "特典アンロックイベント",
    achievementRate: "{rate}% 達成",
    milestoneAchieved: "{threshold}% 達成",
    unlocked: "アンロック",
    optionSelect: "{title}を選択",
    stages: {
      demand_survey: { label: "需要調査", shortLabel: "需要" },
      pre_deposit: { label: "事前入金", shortLabel: "事前入金" },
      general_deposit: { label: "一般入金", shortLabel: "入金" },
      in_production: { label: "制作中", shortLabel: "制作" },
      shipping: { label: "配送開始", shortLabel: "配送" },
    },
    milestones: {
      productionConfirmed: "制作確定",
      hologramSticker: "ホログラムステッカープレゼント",
      unreleasedPocaSet: "未公開トレカスペシャルセット",
    },
    bonus: {
      preDepositTitle: "事前入金特典：未公開トレカ1枚プレゼント",
      preDepositDescription:
        "事前入金期間に参加すると、ランダムな未公開トレカをお届けします",
      fullSetTitle: "フルセット特典：重複なしトレカセット",
      fullSetDescription:
        "全メンバーオプション選択時、メンバー別トレカが重複なく構成されます",
    },
    demandSurvey: {
      title: "需要調査に参加",
      description:
        "このグッズに興味がある方はご参加ください。参加人数が集まると次のステップに進みます。",
      clickHint: "需要調査のステップをタップして参加できます。",
      joinShort: "参加",
      participateButton: "需要調査に参加する",
      participating: "参加中...",
      success: "ご参加ありがとうございます！",
      alreadyParticipated: "すでに需要調査に参加済みです。",
      error: "参加中にエラーが発生しました。しばらくしてから再度お試しください。",
      close: "閉じる",
      emailLabel: "メールアドレス（任意）",
      emailPlaceholder: "example@email.com",
      emailOptional: "メールを登録すると制作情報をお届けします。",
    },
  },
}

export default dictionary
