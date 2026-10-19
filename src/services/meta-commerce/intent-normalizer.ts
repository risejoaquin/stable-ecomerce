/**
 * Spanish Retail Text Normalizer & Sanitizer
 *
 * Provides deterministic normalization for Spanish e-commerce interactions:
 * - Diacritic / accent stripping (á->a, é->e, í->i, ó->o, ú->u, ü->u)
 * - Punctuation & symbol stripping
 * - Emoji stripping
 * - Slang & common contraction expansion
 * - Repeated letter collapse (e.g. "holaaaaa" -> "hola", "preciiooo" -> "precio")
 * - Adversarial prompt injection & code injection detection
 */

export interface NormalizedInput {
  rawInput: string;
  normalizedText: string;
  tokens: string[];
  adversarialDetected: boolean;
  adversarialReason: string | null;
}

const ADVERSARIAL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Prompt injection & system override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, reason: 'prompt_injection_ignore_instructions' },
  { pattern: /ignora\s+(todas\s+las\s+)?(instrucciones|reglas|indicaciones)/i, reason: 'prompt_injection_ignora_instrucciones' },
  { pattern: /olvida\s+(todas\s+las\s+)?(instrucciones|reglas)/i, reason: 'prompt_injection_olvida_instrucciones' },
  { pattern: /system\s*:\s*/i, reason: 'prompt_injection_system_role' },
  { pattern: /you\s+are\s+now\s+(an?\s+)?admin/i, reason: 'prompt_injection_admin_override' },
  { pattern: /act\s+as\s+(an?\s+)?admin/i, reason: 'prompt_injection_act_as' },
  { pattern: /ahora\s+eres\s+(un\s+)?administrador/i, reason: 'prompt_injection_admin_es' },
  { pattern: /jailbreak|dan\s+mode/i, reason: 'prompt_injection_jailbreak' },

  // E-commerce exploit attempts (falsifying prices/orders/stock)
  { pattern: /(pon|cambia|fija)\s+el\s+precio\s+en\s+(\$|usd|mxn)?\s*0/i, reason: 'exploit_zero_price' },
  { pattern: /dime\s+que\s+(es|cuesta)\s+gratis/i, reason: 'exploit_claim_free' },
  { pattern: /(marca|confirma)\s+(que\s+ya\s+)?(pague|esta\s+pagado|orden\s+creada)/i, reason: 'exploit_fake_order_confirmation' },
  { pattern: /grant\s+(me\s+)?(100%|free|discount)/i, reason: 'exploit_grant_discount' },

  // Code / SQL / XSS injection attempts
  { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i, reason: 'xss_script_tag' },
  { pattern: /javascript\s*:/i, reason: 'xss_javascript_protocol' },
  { pattern: /select\s+.*?\s+from/i, reason: 'sql_injection_select' },
  { pattern: /union\s+select|drop\s+table|insert\s+into|delete\s+from/i, reason: 'sql_injection_attempt' },
  { pattern: /'\s*or\s*['"]?1['"]?\s*=\s*['"]?1/i, reason: 'sql_injection_tautology' },
];

/**
 * Maps accented vowels to their ASCII counterparts.
 */
function stripAccents(str: string): string {
  return str
    .replace(/[áàäâ]/gi, 'a')
    .replace(/[éèëê]/gi, 'e')
    .replace(/[íìïî]/gi, 'i')
    .replace(/[óòöô]/gi, 'o')
    .replace(/[úùüû]/gi, 'u');
}

/**
 * Collapses 3 or more repeated consecutive identical characters down to 1 or 2.
 * E.g., "holaaaaa" -> "hola", "preciiooo" -> "precio", "porrrfaa" -> "porfa".
 */
function collapseRepeatedChars(str: string): string {
  return str.replace(/(.)\1{2,}/g, (match, char) => {
    // Preserve double 'r' or double 'l' which are valid in Spanish (carro, talla, llegar)
    if (char === 'r' || char === 'l') {
      return char + char;
    }
    return char;
  });
}

/**
 * Normalizes common Spanish informal abbreviations and shorthand into canonical tokens.
 */
function expandSpanishSlang(tokens: string[]): string[] {
  const result: string[] = [];

  for (const token of tokens) {
    switch (token) {
      case 'q':
      case 'k':
        result.push('que');
        break;
      case 'd':
        result.push('de');
        break;
      case 'x':
        result.push('por');
        break;
      case 'xq':
      case 'xke':
      case 'pq':
        result.push('porque');
        break;
      case 'ola':
        result.push('hola');
        break;
      case 'porfa':
      case 'porfas':
      case 'xfa':
      case 'xfi':
      case 'plis':
      case 'pls':
        result.push('por', 'favor');
        break;
      default:
        result.push(token);
        break;
    }
  }

  return result;
}

/**
 * Normalizes an inbound message for deterministic retail intent routing.
 */
export function normalizeSpanishRetailText(rawText: string | null | undefined): NormalizedInput {
  if (rawText === null || rawText === undefined) {
    return {
      rawInput: '',
      normalizedText: '',
      tokens: [],
      adversarialDetected: false,
      adversarialReason: null,
    };
  }

  const rawInput = String(rawText);

  // 1. Check for adversarial injection patterns before stripping
  let adversarialDetected = false;
  let adversarialReason: string | null = null;

  for (const check of ADVERSARIAL_PATTERNS) {
    if (check.pattern.test(rawInput)) {
      adversarialDetected = true;
      adversarialReason = check.reason;
      break;
    }
  }

  // 2. Strip emojis and unicode symbols
  let cleaned = rawInput
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
    .trim();

  // 3. Lowercase
  cleaned = cleaned.toLowerCase();

  // 4. Strip accents
  cleaned = stripAccents(cleaned);

  // 5. Collapse repeated characters (e.g. "holaaaa" -> "hola")
  cleaned = collapseRepeatedChars(cleaned);

  // 6. Strip punctuation and non-alphanumeric (keep spaces and digits)
  // Note: preserve 'ñ'
  cleaned = cleaned.replace(/[^a-z0-9ñ\s]/g, ' ');

  // 7. Tokenize and expand shorthand
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const expandedTokens = expandSpanishSlang(rawTokens);

  // 8. Reconstruct normalized text from expanded tokens
  const normalizedText = expandedTokens.join(' ').trim();
  const tokens = expandedTokens;

  return {
    rawInput,
    normalizedText,
    tokens,
    adversarialDetected,
    adversarialReason,
  };
}
