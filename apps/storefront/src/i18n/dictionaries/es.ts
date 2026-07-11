import type { Dictionary } from "../types"

const dictionary: Dictionary = {
  nav: {
    storeName: "Compra Grupal",
    groupBuying: "Compra grupal",
    account: "Cuenta",
    cart: "Carrito",
    menu: "Menú",
  },
  hero: {
    badge: "Compras grupales limitadas",
    title: "Cuantos más seamos, menor el precio",
    subtitle:
      "Únete a nuestras compras grupales limitadas: al alcanzar la meta, disfruta descuentos exclusivos y envío rápido.",
    cta: "Ver compras grupales",
  },
  products: {
    allProducts: "Todos los productos",
    products: "Productos",
    homeDescription:
      "Se muestran todos los productos publicados sin filtros.",
    groupBuyingDescription:
      "Todos los productos publicados están listados. Compra en grupo y ahorra más.",
    empty:
      "No hay productos publicados. Publique productos en Medusa Admin.",
    regionError:
      "No se pudo cargar la región. Configure las regiones en Medusa Admin.",
    detailDescription: "Descripción detallada",
    relatedProducts: "Productos relacionados",
    relatedProductsDescription:
      "También te pueden interesar estos productos.",
    addToCart: "Añadir al carrito",
    selectVariant: "Seleccionar variante",
    outOfStock: "Agotado",
    selectOptions: "Seleccionar opciones",
    priceFrom: "Desde ",
    originalPriceLabel: "Original: ",
  },
  groupBuying: {
    title: "Compra grupal",
    backToList: "← Volver a compras grupales",
    discount: "de descuento",
    originalPrice: "Precio original",
    targetAndCurrent: "Meta {target} · {current} participantes",
    joinTitle: "Participar",
    participants: "{current} / {target} participantes",
    joinSuccess: "¡Te has unido a la compra grupal!",
    joinSuccessNote:
      "El pago con descuento se procesará cuando se alcance la meta.",
    joinClosedFull: "La compra está cerrada porque se alcanzó la meta.",
    joinClosedInactive: "Esta compra grupal no está disponible ahora.",
    email: "Correo electrónico",
    quantity: "Cantidad",
    joinButton: "Unirse a la compra grupal",
    joining: "Uniéndose...",
    joinError: "Ocurrió un error al unirse.",
    timeRemaining: "Tiempo restante",
  },
  cart: {
    title: "Carrito",
    quantity: "Cantidad",
    remove: "Eliminar",
    subtotal: "Subtotal",
    subtotalNote: "(sin impuestos)",
    goToCart: "Ir al carrito",
    empty: "Tu carrito está vacío.",
    explore: "Explorar productos",
  },
  sideMenu: {
    home: "Inicio",
    store: "Tienda",
    account: "Cuenta",
    cart: "Carrito",
    copyright: "Todos los derechos reservados.",
  },
  idol: {
    productionStatus: "Estado de producción",
    participationRate: "Participación en tiempo real",
    participationProgress: "{current} / {target} participando",
    unlockEvent: "Evento de desbloqueo de bonificaciones",
    achievementRate: "{rate}% alcanzado",
    milestoneAchieved: "{threshold}% alcanzado",
    unlocked: "DESBLOQUEADO",
    optionSelect: "Seleccionar {title}",
    stages: {
      demand_survey: { label: "Encuesta de demanda", shortLabel: "Demanda" },
      pre_deposit: { label: "Pre-pedido", shortLabel: "Pre-pedido" },
      general_deposit: { label: "Depósito general", shortLabel: "Depósito" },
      in_production: { label: "En producción", shortLabel: "Producción" },
      shipping: { label: "Envío iniciado", shortLabel: "Envío" },
    },
    milestones: {
      productionConfirmed: "Producción confirmada",
      hologramSticker: "Pegatina holográfica de regalo",
      unreleasedPocaSet: "Set especial de photocards inéditas",
    },
    bonus: {
      preDepositTitle: "Bonificación de pre-pedido: 1 photocard inédita",
      preDepositDescription:
        "Participa durante el pre-pedido y recibe una photocard inédita al azar",
      fullSetTitle: "Bonificación set completo: set sin duplicados",
      fullSetDescription:
        "Selecciona todas las opciones de miembros para un set completo sin duplicados",
    },
    demandSurvey: {
      title: "Participar en la encuesta de demanda",
      description:
        "Muestra tu interés en este producto. Cuando haya suficientes participantes, pasaremos a la siguiente etapa.",
      clickHint: "Toca la etapa de encuesta de demanda para participar.",
      joinShort: "Unirse",
      participateButton: "Participar en la encuesta",
      participating: "Participando...",
      success: "¡Gracias! Tu interés ha sido registrado.",
      alreadyParticipated: "Ya participaste en esta encuesta de demanda.",
      error: "Ocurrió un error. Inténtalo de nuevo en un momento.",
      close: "Cerrar",
      emailLabel: "Correo electrónico (opcional)",
      emailPlaceholder: "example@email.com",
      emailOptional: "Deja tu correo para recibir novedades de producción.",
    },
  },
}

export default dictionary
