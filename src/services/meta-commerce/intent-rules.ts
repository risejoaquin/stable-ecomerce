import type { ConversationIntent } from '../../types/meta-commerce';
import type { ExtractedEntities, IntentMatchDetail } from './intent-types';

export interface IntentRule {
  intent: ConversationIntent;
  name: string;
  priority: number; // Higher number = evaluated earlier & favored in disambiguation
  baseConfidence: number;
  patterns: RegExp[];
  exactMatches?: string[];
  entityExtractor?: (normalizedText: string, tokens: string[]) => Partial<ExtractedEntities>;
}

/**
 * Common Spanish clothing and footwear sizes.
 */
const SIZE_LETTER_MAP: Record<string, string> = {
  'doble extra grande': 'XXL',
  'extra grande': 'XL',
  'extra chica': 'XS',
  'extra chico': 'XS',
  xch: 'XS',
  xg: 'XL',
  '2xl': 'XXL',
  '3xl': '3XL',
  xxl: 'XXL',
  xs: 'XS',
  s: 'S',
  chica: 'S',
  chico: 'S',
  ch: 'S',
  m: 'M',
  mediana: 'M',
  mediano: 'M',
  med: 'M',
  l: 'L',
  grande: 'L',
  gde: 'L',
  g: 'L',
  xl: 'XL',
};

// Sorted by length descending to ensure longest matches like "extra grande" match before "grande"
const SORTED_SIZE_KEYS = Object.keys(SIZE_LETTER_MAP).sort((a, b) => b.length - a.length);

const CANONICAL_COLOR_MAP: Record<string, string> = {
  negro: 'negro',
  negra: 'negro',
  negros: 'negro',
  negras: 'negro',
  blanco: 'blanco',
  blanca: 'blanco',
  blancos: 'blanco',
  blancas: 'blanco',
  rojo: 'rojo',
  roja: 'rojo',
  rojos: 'rojo',
  rojas: 'rojo',
  azul: 'azul',
  azules: 'azul',
  verde: 'verde',
  verdes: 'verde',
  gris: 'gris',
  grises: 'gris',
  beige: 'beige',
  cafe: 'cafe',
  morado: 'morado',
  morada: 'morado',
  morados: 'morado',
  moradas: 'morado',
  lila: 'morado',
  amarillo: 'amarillo',
  amarilla: 'amarillo',
  amarillos: 'amarillo',
  amarillas: 'amarillo',
  rosa: 'rosa',
  rosas: 'rosa',
  rosado: 'rosa',
  rosada: 'rosa',
  rosados: 'rosa',
  rosadas: 'rosa',
  naranja: 'naranja',
  tinto: 'vino',
  tintos: 'vino',
  vino: 'vino',
  vinos: 'vino',
  plata: 'plata',
  plateado: 'plata',
  dorado: 'dorado',
  oro: 'dorado',
};

const COMMON_COLORS = Object.keys(CANONICAL_COLOR_MAP);

const CANONICAL_PRODUCT_MAP: Record<string, string> = {
  hoodies: 'hoodie',
  hoodie: 'hoodie',
  sudaderas: 'sudadera',
  sudadera: 'sudadera',
  playeras: 'playera',
  playera: 'playera',
  pantalones: 'pantalon',
  pantalon: 'pantalon',
  joggers: 'jogger',
  jogger: 'jogger',
  gorras: 'gorra',
  gorra: 'gorra',
  chamarras: 'chamarra',
  chamarra: 'chamarra',
  calcetines: 'calcetas',
  calcetas: 'calcetas',
  tazas: 'taza',
  taza: 'taza',
  shorts: 'short',
  short: 'short',
  polo: 'polo',
  relic: 'relic',
  'black relic': 'black relic',
};

const COMMON_CITIES = [
  'guadalajara',
  'gdl',
  'monterrey',
  'mty',
  'cdmx',
  'ciudad de mexico',
  'mexico',
  'puebla',
  'tijuana',
  'queretaro',
  'qro',
  'merida',
  'cancun',
  'leon',
  'toluca',
  'veracruz',
  'morelia',
  'zapopan',
  'san luis potosi',
  'aguascalientes',
  'saltillo',
  'hermosillo',
  'culiacan',
  'chihuahua',
];

const SPANISH_WORD_NUMBERS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  par: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  docena: 12,
};

/**
 * Universal entity extractor across all retail text.
 */
export function extractRetailEntities(normalizedText: string, tokens: string[]): ExtractedEntities {
  let detectedSize: string | null = null;
  let detectedColor: string | null = null;
  let detectedQuantity: number | null = null;
  let detectedPaymentMethod: string | null = null;
  let detectedShippingCity: string | null = null;
  let detectedProductMention: string | null = null;

  // 1. Extract Size (check longest size phrases first)
  for (const key of SORTED_SIZE_KEYS) {
    const reg = new RegExp(`\\b${key}\\b`, 'i');
    if (reg.test(normalizedText)) {
      detectedSize = SIZE_LETTER_MAP[key];
      break;
    }
  }

  if (!detectedSize) {
    const sizeWithPrefixMatch = normalizedText.match(/\b(?:talla|tamano|size|medida)\s+([a-z0-9]+)\b/i);
    if (sizeWithPrefixMatch && sizeWithPrefixMatch[1]) {
      const rawVal = sizeWithPrefixMatch[1].toLowerCase();
      if (SIZE_LETTER_MAP[rawVal]) {
        detectedSize = SIZE_LETTER_MAP[rawVal];
      } else if (/^\d{2}$/.test(rawVal)) {
        detectedSize = rawVal;
      }
    }
  }

  if (!detectedSize) {
    const directSizeMatch = normalizedText.match(/\b(?:tienes|hay|en|queda|tendra)\s+(xs|s|m|l|xl|xxl|2xl|3xl)\b/i);
    if (directSizeMatch && directSizeMatch[1]) {
      const rawVal = directSizeMatch[1].toLowerCase();
      detectedSize = SIZE_LETTER_MAP[rawVal] || rawVal.toUpperCase();
    }
  }

  if (!detectedSize) {
    const numericWaistMatch = normalizedText.match(/\b(?:talla\s+)?(2[6-9]|3[0-8]|40|42)\b/i);
    if (numericWaistMatch && numericWaistMatch[1]) {
      detectedSize = numericWaistMatch[1];
    }
  }

  // 2. Extract Color
  for (const c of COMMON_COLORS) {
    const colorReg = new RegExp(`\\b(?:en\\s+|color\\s+)?${c}\\b`, 'i');
    if (colorReg.test(normalizedText)) {
      detectedColor = CANONICAL_COLOR_MAP[c] || c;
      break;
    }
  }

  // 3. Extract Quantity
  const digitQtyMatch = normalizedText.match(/\b(?:quiero|dame|apartame|apuntame|comprar|pedir|llevo)?\s*(\d+)\s*(?:piezas?|prendas?|hoodies?|playeras?|pzas?|unidades?|articulos?)?\b/i);
  if (digitQtyMatch && digitQtyMatch[1]) {
    const val = parseInt(digitQtyMatch[1], 10);
    if (val >= 1 && val <= 99) {
      detectedQuantity = val;
    }
  }

  if (!detectedQuantity) {
    for (const [word, num] of Object.entries(SPANISH_WORD_NUMBERS)) {
      const wordQtyReg = new RegExp(`\\b(?:quiero|dame|apartame|apuntame|comprar|pedir|llevo)?\\s*${word}\\s+(?:piezas?|prendas?|hoodies?|playeras?|pzas?|unidades?|par|chamarra|gorra)\\b`, 'i');
      if (wordQtyReg.test(normalizedText)) {
        detectedQuantity = num;
        break;
      }
    }
  }

  // 4. Extract Payment Method
  if (/\b(?:transferencia|spei|transfer|clabe)\b/i.test(normalizedText)) {
    detectedPaymentMethod = 'transferencia';
  } else if (/\b(?:tarjeta|credito|debito|visa|mastercard|amex)\b/i.test(normalizedText)) {
    detectedPaymentMethod = 'tarjeta';
  } else if (/\b(?:oxxo|deposito|seven|seven eleven)\b/i.test(normalizedText)) {
    detectedPaymentMethod = 'oxxo';
  } else if (/\b(?:efectivo|contra entrega|pago al recibir)\b/i.test(normalizedText)) {
    detectedPaymentMethod = 'efectivo';
  } else if (/\bpaypal\b/i.test(normalizedText)) {
    detectedPaymentMethod = 'paypal';
  }

  // 5. Extract Shipping City
  for (const city of COMMON_CITIES) {
    const cityReg = new RegExp(`\\b(?:a|hacia|en|para)\\s+${city}\\b|\\b${city}\\b`, 'i');
    if (cityReg.test(normalizedText)) {
      detectedShippingCity = city;
      break;
    }
  }

  // 6. Extract Product Mention (canonicalizing plurals)
  for (const [prodWord, canonicalName] of Object.entries(CANONICAL_PRODUCT_MAP)) {
    const prodReg = new RegExp(`\\b${prodWord}\\b`, 'i');
    if (prodReg.test(normalizedText)) {
      detectedProductMention = canonicalName;
      break;
    }
  }

  return {
    size: detectedSize,
    color: detectedColor,
    quantity: detectedQuantity,
    paymentMethod: detectedPaymentMethod,
    shippingCity: detectedShippingCity,
    productMention: detectedProductMention,
  };
}

/**
 * 14 Canonical Deterministic Retail Intent Rules
 */
export const RETAIL_INTENT_RULES: IntentRule[] = [
  // -------------------------------------------------------------
  // 1. HUMAN HELP (Priority: 100 - Highest safety escalation)
  // -------------------------------------------------------------
  {
    intent: 'human_help',
    name: 'human_help_rule',
    priority: 100,
    baseConfidence: 0.98,
    exactMatches: [
      'quiero hablar con alguien',
      'hablar con alguien',
      'comunicarme con alguien',
      'pasame a un asesor',
      'pasame con un asesor',
      'pasame a un humano',
      'pasame con un humano',
      'un humano por favor',
      'ayuda de una persona',
      'atencion a clientes',
      'agente humano',
      'asesor humano',
      'persona real',
      'humano',
      'asesor',
    ],
    patterns: [
      /\bquiero hablar con (?:alguien|una persona|un humano|el encargado|un asesor)\b/i,
      /\b(?:pasame|comunicame|transfiereme)\s+(?:a|con)\s+(?:un\s+)?(?:asesor|humano|persona|agente|operador|encargado)\b/i,
      /\b(?:un\s+)?humano\s+(?:por favor|plis|porfa)\b/i,
      /\b(?:atencion|servicio)\s+(?:al?\s+cliente|a\s+clientes|personalizada)\b/i,
      /\bno\s+quiero\s+(?:hablar\s+con\s+)?(?:un\s+)?bot\b/i,
      /\bdeja\s+de\s+responder\s+como\s+bot\b/i,
      /\bhablar\s+con\s+(?:alguien|persona|humano)\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 2. RETURN / EXCHANGE (Priority: 85)
  // -------------------------------------------------------------
  {
    intent: 'return_exchange',
    name: 'return_exchange_rule',
    priority: 85,
    baseConfidence: 0.95,
    exactMatches: [
      'quiero cambiar de talla',
      'cambio de talla',
      'puedo devolverlo',
      'quiero devolverlo',
      'no me quedo',
      'politica de devolucion',
      'politica de cambios',
      'hacer devolucion',
    ],
    patterns: [
      /\b(?:quiero|puedo|como\s+hago\s+para)?\s*cambiar\s+(?:de\s+)?(?:talla|prenda|modelo|producto)\b/i,
      /\b(?:puedo|quiero)\s+devolver(?:lo|la|los|las)?\b/i,
      /\b(?:no\s+me\s+quedo|me\s+quedo\s+(?:grande|chico|chica|apretado))\b/i,
      /\b(?:politica|politicas)\s+de\s+(?:devolucion|cambio|devoluciones|cambios)\b/i,
      /\b(?:vino|llego)\s+(?:defectuoso|roto|danado|mal)\b/i,
      /\b(?:hacer|solicitar)\s+(?:una\s+)?devolucion\b/i,
      /\b(?:reembolso|devolver\s+dinero)\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 3. ORDER STATUS / TRACKING (Priority: 80)
  // -------------------------------------------------------------
  {
    intent: 'order_status',
    name: 'order_status_rule',
    priority: 80,
    baseConfidence: 0.95,
    exactMatches: [
      'como va mi pedido',
      'estatus de mi pedido',
      'estado de mi pedido',
      'rastreo de mi orden',
      'rastrear mi pedido',
      'cuando llega mi paquete',
      'donde viene mi paquete',
      'mi numero de guia',
    ],
    patterns: [
      /\b(?:como\s+va|estatus|estado)\s+(?:de\s+)?mi\s+(?:pedido|orden|compra|paquete)\b/i,
      /\brastreo\s+(?:de\s+)?(?:mi\s+)?(?:orden|pedido|paquete|guia)\b/i,
      /\brastrear\s+(?:mi\s+)?(?:pedido|orden|paquete)\b/i,
      /\b(?:cuando|donde)\s+(?:llega|viene)\s+mi\s+(?:paquete|pedido|orden|guia)\b/i,
      /\b(?:numero\s+de\s+guia|guia\s+de\s+(?:rastreo|envio)|mi\s+guia)\b/i,
      /\bno\s+ha\s+llegado\s+mi\s+(?:paquete|pedido)\b/i,
      /\bya\s+(?:enviaron|mandaron)\s+mi\s+(?:pedido|paquete)\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 4. CHECKOUT (Priority: 75)
  // -------------------------------------------------------------
  {
    intent: 'checkout',
    name: 'checkout_rule',
    priority: 75,
    baseConfidence: 0.95,
    exactMatches: [
      'listo para pagar',
      'lista para pagar',
      'mandame el link',
      'pasame el link',
      'dame el link',
      'link de pago',
      'link para pagar',
      'quiero cerrar el pedido',
      'cerrar pedido',
      'finalizar compra',
      'finalizar pedido',
      'proceder al pago',
      'ya quiero pagar',
    ],
    patterns: [
      /\b(?:listo|lista)\s+para\s+pagar\b/i,
      /\b(?:mandame|pasame|dame|enviame|comparteme)\s+el\s+link(?:\s+(?:de|para)\s+pago)?\b/i,
      /\blink\s+(?:de|para)\s+pag(?:o|ar)\b/i,
      /\bquiero\s+cerrar\s+el\s+pedido\b/i,
      /\b(?:finalizar|completar|terminar)\s+(?:la\s+)?(?:compra|pedido|orden)\b/i,
      /\bproceder\s+al\s+pago\b/i,
      /\bya\s+(?:voy\s+a|quiero)\s+pagar\b/i,
      /\bdonde\s+pago\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 5. ADD TO CART / BUY INTENT (Priority: 70)
  // -------------------------------------------------------------
  {
    intent: 'add_to_cart',
    name: 'add_to_cart_rule',
    priority: 70,
    baseConfidence: 0.95,
    exactMatches: [
      'quiero comprar',
      'quiero comprarlo',
      'quiero comprarla',
      'apartamela',
      'apartamelo',
      'apartalo',
      'aparta',
      'lo quiero',
      'la quiero',
      'me lo llevo',
      'me la llevo',
      'agregamelo',
      'agrega al carrito',
      'me interesa comprarlo',
      'quiero hacer un pedido',
      'quiero ordenar',
      'guardamela',
      'guardamelo',
    ],
    patterns: [
      /\b(?:quiero|deseo|me\s+gustaria|me\s+interesa)\s+comprar(?:lo|la|los|las)?\b/i,
      /\baparta(?:mela|melo|lo|la|me)?\b/i,
      /\b(?:lo|la|me\s+lo|me\s+la)\s+llevo\b/i,
      /\b(?:lo|la)\s+quiero\b/i,
      /\bagrega(?:melo|mela|r)?\s+(?:al?\s+)?carrito\b/i,
      /\bquiero\s+(?:hacer\s+un\s+pedido|pedir|ordenar)\b/i,
      /\bguarda(?:melo|mela|lo|la)\b/i,
      /\bdame\s+(?:uno|una|dos|\d+)\b/i,
      /\bme\s+lo\s+apartas\b/i,
      /\bcomo\s+(?:hago\s+para\s+comprar|lo\s+compro)\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 6. SHIPPING (Priority: 65)
  // -------------------------------------------------------------
  {
    intent: 'shipping',
    name: 'shipping_rule',
    priority: 65,
    baseConfidence: 0.95,
    exactMatches: [
      'haces envios',
      'hacen envios',
      'cuanto tarda el envio',
      'costo de envio',
      'precio de envio',
      'envio gratis',
      'envias a domicilio',
      'haces entregas personales',
    ],
    patterns: [
      /\b(?:haces|hacen|realizas|realizan|tienen)\s+envios?\b/i,
      /\b(?:cuanto\s+(?:tarda|demora|se\s+tarda)|tiempo\s+de\s+entrega)\s+(?:el\s+)?envio\b/i,
      /\b(?:costo|precio|cuanto\s+cuesta|cuanto\s+sale)\s+(?:de\s+)?(?:el\s+)?envio\b/i,
      /\b(?:haces\s+)?envios?\s+a\s+[a-zñ\s]+\b/i,
      /\bllega\s+a\s+[a-zñ\s]+\b/i,
      /\benvio\s+(?:gratis|nacional|express|estandar)\b/i,
      /\bpor\s+que\s+paqueteria\b/i,
      /\b(?:estafeta|fedex|dhl|redpack)\b/i,
      /\bentregas?\s+personales?\b/i,
      /\bpunto\s+de\s+entrega\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 7. PAYMENT (Priority: 65)
  // -------------------------------------------------------------
  {
    intent: 'payment',
    name: 'payment_rule',
    priority: 65,
    baseConfidence: 0.95,
    exactMatches: [
      'aceptas transferencia',
      'aceptas tarjeta',
      'aceptas efectivo',
      'aceptas oxxo',
      'como puedo pagar',
      'metodos de pago',
      'formas de pago',
      'tienen msi',
      'meses sin intereses',
    ],
    patterns: [
      /\bacepta(?:s|n)?\s+(?:transferencia|tarjeta|efectivo|oxxo|paypal|spei|deposito)\b/i,
      /\b(?:como|donde)\s+(?:puedo|se\s+puede)\s+pagar\b/i,
      /\b(?:metodos|formas|opciones)\s+de\s+pago\b/i,
      /\b(?:tienen|manejan|aceptan)\s+(?:msi|meses\s+sin\s+intereses)\b/i,
      /\bpago\s+con\s+(?:tarjeta|transferencia|oxxo|efectivo)\b/i,
      /\bpago\s+contra\s+entrega\b/i,
      /\bse\s+puede\s+pagar\s+(?:por|en|con)\b/i,
      /\btienen\s+spei\b/i,
      /\bcuenta\s+para\s+transferir\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 8. SIZE (Priority: 60)
  // -------------------------------------------------------------
  {
    intent: 'size',
    name: 'size_rule',
    priority: 60,
    baseConfidence: 0.95,
    exactMatches: [
      'tienes m',
      'tienes s',
      'tienes l',
      'tienes xl',
      'tienes talla 30',
      'tienes talla 32',
      'tienes talla chica',
      'tienes talla mediana',
      'tienes talla grande',
      'que tallas manejas',
      'que tallas tienen',
      'viene reducido',
      'viene amplia',
      'guia de tallas',
      'tabla de medidas',
    ],
    patterns: [
      /\btienes\s+(?:xs|s|m|l|xl|xxl|2xl|3xl)\b/i,
      /\btienes\s+talla\s+[a-z0-9]+\b/i,
      /\bhay\s+(?:en\s+)?talla\s+[a-z0-9]+\b/i,
      /\bque\s+tallas?\s+(?:manejas?|tienes?|hay|quedan)\b/i,
      /\b(?:viene|esta)\s+(?:reducid[oa]|ampli[oa]|holgad[oa]|fiel\s+a\s+la\s+talla)\b/i,
      /\b(?:guia|tabla)\s+de\s+(?:tallas|medidas)\b/i,
      /\bmedidas\s+de\s+la\s+talla\b/i,
      /\btalla\s+(?:2[6-9]|3[0-8]|40|42)\b/i,
      /\btienes\s+(?:chica|mediana|grande|extra\s+grande)\b/i,
      /\ben\s+talla\s+[a-z0-9]+\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 9. COLOR (Priority: 60)
  // -------------------------------------------------------------
  {
    intent: 'color',
    name: 'color_rule',
    priority: 60,
    baseConfidence: 0.95,
    exactMatches: [
      'hay en negro',
      'hay en blanco',
      'hay en rojo',
      'tienes en negro',
      'tienes en blanco',
      'que colores tienen',
      'que colores hay',
      'colores disponibles',
      'lo tienes en negro',
      'tienes otros colores',
    ],
    patterns: [
      /\bhay\s+en\s+(?:negro|blanco|rojo|azul|verde|gris|beige|cafe|morado|amarillo|rosa|tinto|vino)\b/i,
      /\btienes\s+(?:en\s+)?(?:negro|blanco|rojo|azul|verde|gris|beige|cafe|morado|amarillo|rosa|tinto|vino)\b/i,
      /\blo\s+tienes\s+en\s+[a-z]+\b/i,
      /\bque\s+colores?\s+(?:tienes?|tienen|hay|manejas?|quedan|disponibles)\b/i,
      /\bcolores?\s+disponibles?\b/i,
      /\b(?:tienes?|tienen|hay)\s+(?:otros?|mas)\s+colores?\b/i,
      /\ben\s+que\s+colores?\s+lo\s+tienen\b/i,
      /\bcolor\s+(?:negro|blanco|rojo|azul|verde|gris|beige)\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 10. AVAILABILITY / STOCK (Priority: 55)
  // -------------------------------------------------------------
  {
    intent: 'availability',
    name: 'availability_rule',
    priority: 55,
    baseConfidence: 0.92,
    exactMatches: [
      'tienes disponible',
      'esta disponible',
      'hay stock',
      'tienen stock',
      'aun les queda',
      'todavia tienen',
      'tienes en existencia',
      'hay en existencia',
      'todavia hay',
      'aun tienen',
      'sigue disponible',
    ],
    patterns: [
      /\b(?:tienes?|tienen|esta|hay|sigue)\s+disponible\b/i,
      /\b(?:hay|tienen|queda|en)\s+stock\b/i,
      /\b(?:aun|todavia)\s+(?:les\s+)?(?:queda|tienen|hay)\b/i,
      /\b(?:tienes?|tienen|hay)\s+(?:en\s+)?existencia\b/i,
      /\bquedan\s+piezas\b/i,
      /\bse\s+agoto\b/i,
      /\besta\s+agotado\b/i,
      /\btodavia\s+alcanzo\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 11. PRICE (Priority: 50)
  // -------------------------------------------------------------
  {
    intent: 'price',
    name: 'price_rule',
    priority: 50,
    baseConfidence: 0.95,
    exactMatches: [
      'precio',
      'precios',
      'cuanto cuesta',
      'cuanto sale',
      'cuanto vale',
      'que precio tiene',
      'que costo tiene',
      'cual es el precio',
      'cual es el costo',
      'costo',
      'a como esta',
      'a como lo das',
      'en cuanto esta',
      'en cuanto sale',
      'valor',
    ],
    patterns: [
      /\bprecio\b/i,
      /\bcosto\b/i,
      /\bcuanto\s+(?:cuesta|sale|vale|seria)\b/i,
      /\bque\s+(?:precio|costo)\s+tiene\b/i,
      /\bcual\s+es\s+el\s+(?:precio|costo)\b/i,
      /\ba\s+como\s+(?:esta|lo\s+das|sale)\b/i,
      /\ben\s+cuanto\s+(?:esta|sale|lo\s+dejas)\b/i,
      /\bque\s+valor\s+tiene\b/i,
      /\bcotizacion\b/i,
      /\bcotizar\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 12. PRODUCT INFO / FABRIC / DETAILS (Priority: 45)
  // -------------------------------------------------------------
  {
    intent: 'product_info',
    name: 'product_info_rule',
    priority: 45,
    baseConfidence: 0.90,
    exactMatches: [
      'de que material es',
      'de que tela es',
      'como es la tela',
      'cuentame del hoodie',
      'informacion',
      'info',
      'detalles',
      'mas informacion',
      'de que esta hecho',
      'fotos reales',
      'tienes fotos',
    ],
    patterns: [
      /\bde\s+que\s+(?:material|tela)\s+es\b/i,
      /\bcomo\s+es\s+la\s+tela\b/i,
      /\bcuentame\s+(?:del?|sobre)\s+[a-z\s]+\b/i,
      /\b(?:informacion|detalles|caracteristicas)\s+(?:del?|sobre)?\b/i,
      /\bde\s+que\s+esta\s+hecho\b/i,
      /\bes\s+(?:algodon|poliester|oversized|original)\b/i,
      /\bque\s+composicion\s+tiene\b/i,
      /\b(?:tienes|mandame|me\s+pasas)\s+fotos?\s*(?:reales)?\b/i,
      /\bfoto\s+real\b/i,
    ],
  },

  // -------------------------------------------------------------
  // 13. GREETING (Priority: 20)
  // -------------------------------------------------------------
  {
    intent: 'greeting',
    name: 'greeting_rule',
    priority: 20,
    baseConfidence: 0.88,
    exactMatches: [
      'hola',
      'buenas',
      'buen dia',
      'buenos dias',
      'buenas tardes',
      'buenas noches',
      'hey',
      'que tal',
      'que onda',
      'saludos',
      'hi',
      'hello',
    ],
    patterns: [
      /\bhola\b/i,
      /\bbuen(?:as|os)?\s+(?:dias?|tardes?|noches?)\b/i,
      /\bque\s+(?:tal|onda)\b/i,
      /\bhey\b/i,
      /\bsaludos\b/i,
    ],
  },
];
