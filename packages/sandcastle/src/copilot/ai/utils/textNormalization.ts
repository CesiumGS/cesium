/** Character mappings for normalizing AI-generated smart quotes and typographic chars (pattern from Roo Code). */
const NORMALIZATION_MAPS = {
  SMART_QUOTES: {
    "\u201C": '"', // Left double quote (U+201C) "
    "\u201D": '"', // Right double quote (U+201D) "
    "\u2018": "'", // Left single quote (U+2018) '
    "\u2019": "'", // Right single quote (U+2019) '
  },
  TYPOGRAPHIC: {
    "\u2026": "...", // Ellipsis …
    "\u2014": "-", // Em dash —
    "\u2013": "-", // En dash –
    "\u00A0": " ", // Non-breaking space
  },
};

interface NormalizeOptions {
  /** Replace smart quotes with straight quotes (default: true) */
  smartQuotes?: boolean;
  /** Replace typographic characters with ASCII equivalents (default: true) */
  typographicChars?: boolean;
  /** Collapse multiple whitespace to single space (default: false for code) */
  extraWhitespace?: boolean;
  /** Trim whitespace from start and end (default: false for code) */
  trim?: boolean;
}

// Whitespace/trim default to false so code formatting survives normalization.
const DEFAULT_OPTIONS: NormalizeOptions = {
  smartQuotes: true,
  typographicChars: true,
  extraWhitespace: false,
  trim: false,
};

/**
 * Normalizes a string to handle AI-generated text quirks.
 * This is particularly useful for diff matching where AI models might
 * generate smart quotes or typographic characters.
 *
 * @param str The string to normalize
 * @param options Normalization options
 * @returns The normalized string
 *
 * @example
 * ```typescript
 * // Smart quotes normalization
 * normalizeString('"Hello"') // Returns "Hello"
 * normalizeString(''world'') // Returns 'world'
 *
 * // Typographic characters
 * normalizeString('wait… then—') // Returns 'wait... then-'
 * ```
 */
export function normalizeString(
  str: string,
  options: NormalizeOptions = DEFAULT_OPTIONS,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let normalized = str;

  if (opts.smartQuotes) {
    for (const [smart, regular] of Object.entries(
      NORMALIZATION_MAPS.SMART_QUOTES,
    )) {
      normalized = normalized.replace(new RegExp(smart, "g"), regular);
    }
  }

  if (opts.typographicChars) {
    for (const [typographic, regular] of Object.entries(
      NORMALIZATION_MAPS.TYPOGRAPHIC,
    )) {
      normalized = normalized.replace(new RegExp(typographic, "g"), regular);
    }
  }

  if (opts.extraWhitespace) {
    normalized = normalized.replace(/\s+/g, " ");
  }

  if (opts.trim) {
    normalized = normalized.trim();
  }

  return normalized;
}
