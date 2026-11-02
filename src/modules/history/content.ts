export const HISTORY_TEXT_FIELDS = [
  ["eyebrow", "Etiqueta de la cabecera", 80], ["title", "Título de la página", 120],
  ["lead", "Presentación", 700],
  ["fact1Value", "Dato 1: valor", 60], ["fact1Label", "Dato 1: etiqueta", 60],
  ["fact2Value", "Dato 2: valor", 60], ["fact2Label", "Dato 2: etiqueta", 60],
  ["fact3Value", "Dato 3: valor", 60], ["fact3Label", "Dato 3: etiqueta", 60],
  ["fact4Value", "Dato 4: valor", 60], ["fact4Label", "Dato 4: etiqueta", 60],
  ["grapeLabel", "Capítulo 1: etiqueta", 80], ["grapeTitle", "Capítulo 1: título", 160],
  ["grapeBody1", "La uva: primer párrafo", 1800], ["grapeBody2", "La uva: segundo párrafo", 1800],
  ["grapeNote", "Variedad de uva y cosecha (opcional)", 1000],
  ["juiceLabel", "Capítulo 2: etiqueta", 80], ["juiceTitle", "Capítulo 2: título", 160],
  ["juiceBody", "El zumo: texto", 2400], ["quote", "Cita destacada", 300],
  ["juiceNote", "Elaboración y notas (opcional)", 1000],
  ["tableLabel", "Capítulo 3: etiqueta", 80], ["tableTitle", "Capítulo 3: título", 160],
  ["tableBody", "La mesa: presentación", 1000],
  ["occasion1Title", "Ocasión 1: título", 100], ["occasion1Text", "Ocasión 1: texto", 700],
  ["occasion2Title", "Ocasión 2: título", 100], ["occasion2Text", "Ocasión 2: texto", 700],
  ["occasion3Title", "Ocasión 3: título", 100], ["occasion3Text", "Ocasión 3: texto", 700],
  ["closing", "Frase del cierre", 200], ["buyLabel", "Enlace a la botella", 70],
  ["contactLabel", "Enlace de contacto", 70], ["footer", "Texto del pie de página", 200],
] as const;
export type HistoryTextKey = typeof HISTORY_TEXT_FIELDS[number][0];
export const HISTORY_IMAGE_SLOTS = ["cover", "grape", "juice", "table"] as const;
export type HistoryImageSlot = typeof HISTORY_IMAGE_SLOTS[number];
export type HistoryPhoto = { src: string; alt: string; x: number; y: number };
export type HistoryContent = { texts: Record<HistoryTextKey, string>; images: Record<HistoryImageSlot, HistoryPhoto> };
export const HISTORY_IMAGE_LABELS = { cover: "Cabecera · arco", grape: "La uva · arco", juice: "El zumo · círculo", table: "La mesa · hoja" };
export const DEFAULT_HISTORY: HistoryContent = {
  texts: {
    eyebrow: "Sobre Rosh", title: "Nuestra historia",
    lead: "Rosh es zumo de uva en botella de vino. Sabor auténtico y familiar, para brindar en la mesa sin alcohol.",
    fact1Value: "Condorarma", fact1Label: "Viñedo", fact2Value: "750 ml", fact2Label: "Contenido",
    fact3Value: "0%", fact3Label: "Alcohol", fact4Value: "100%", fact4Label: "Natural",
    grapeLabel: "01 · La uva", grapeTitle: "Todo empieza en la uva",
    grapeBody1: "Rosh es, ante todo, zumo de uva. Con ella se llena una botella de vino de 750 ml, sin alcohol.",
    grapeBody2: "Nace en Viñedo Condorarma y llega a tu mesa como zumo 100% natural.", grapeNote: "",
    juiceLabel: "02 · El zumo", juiceTitle: "Sin alcohol, con ceremonia",
    juiceBody: "Una botella de vino, un brindis de verdad y nada de alcohol. Rosh se sirve como se sirve el vino, para quien no bebe, para quien maneja o para quien simplemente prefiere brindar sin él.",
    quote: "Una botella, un brindis para todos.", juiceNote: "",
    tableLabel: "03 · La mesa", tableTitle: "Para cada mesa",
    tableBody: "Rosh está hecho para los momentos en que todos quieren tener algo en la copa.",
    occasion1Title: "Cenas en familia.", occasion1Text: "Un brindis en la mesa de todos los días o en la de ocasión.",
    occasion2Title: "Celebraciones.", occasion2Text: "Cumpleaños, aniversarios y fin de año, con los mismos brindis de siempre.",
    occasion3Title: "Regalos.", occasion3Text: "Una botella para quien no bebe alcohol y merece brindar igual.",
    closing: "Sabor auténtico y familiar.", buyLabel: "Conocer la botella →", contactLabel: "Contacto",
    footer: "© Vinos Rosh · Zumo de uva, 0% alcohol",
  },
  images: {
    cover: { src: "/media/rosh/history/foto-portada.webp", alt: "Botella Rosh sobre racimos de uva en cajas moradas", x: 50, y: 50 },
    grape: { src: "/media/rosh/history/foto-uva.webp", alt: "Botella Rosh y una copa de zumo de uva entre las parras del viñedo", x: 42, y: 50 },
    juice: { src: "/media/rosh/history/foto-zumo.webp", alt: "Mano sosteniendo una botella de Rosh en una bolsa de tela", x: 55, y: 60 },
    table: { src: "/media/rosh/history/foto-mesa.webp", alt: "Pareja en un sillón con dos copas de Rosh, nueces y fresas sobre una mesa de mármol", x: 62, y: 55 },
  },
};
