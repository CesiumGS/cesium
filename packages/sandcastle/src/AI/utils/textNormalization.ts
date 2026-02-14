/**
 * Common character mappings for text normalization
 * Inspired by Roo Code's approach to handling AI-generated text with smart quotes and typographic characters
 */
export const NORMALIZATION_MAPS = {
  // Smart quotes to regular quotes
  SMART_QUOTES: {
    "\u201C": '"', // Left double quote (U+201C) "
    "\u201D": '"', // Right double quote (U+201D) "
    "\u2018": "'", // Left single quote (U+2018) '
    "\u2019": "'", // Right single quote (U+2019) '
  },
  // Other typographic characters
  TYPOGRAPHIC: {
    "\u2026": "...", // Ellipsis …
    "\u2014": "-", // Em dash —
    "\u2013": "-", // En dash –
    "\u00A0": " ", // Non-breaking space
  },
};

/**
 * Options for string normalization
 */
export interface NormalizeOptions {
  /** Replace smart quotes with straight quotes (default: true) */
  smartQuotes?: boolean;
  /** Replace typographic characters with ASCII equivalents (default: true) */
  typographicChars?: boolean;
  /** Collapse multiple whitespace to single space (default: false for code) */
  extraWhitespace?: boolean;
  /** Trim whitespace from start and end (default: false for code) */
  trim?: boolean;
}

/**
 * Default options for code normalization
 * Note: We default to false for whitespace/trim to preserve code formatting
 */
const DEFAULT_OPTIONS: NormalizeOptions = {
  smartQuotes: true,
  typographicChars: true,
  extraWhitespace: false, // Don't collapse whitespace in code by default
  trim: false, // Don't trim code by default
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

  // Replace smart quotes
  if (opts.smartQuotes) {
    for (const [smart, regular] of Object.entries(
      NORMALIZATION_MAPS.SMART_QUOTES,
    )) {
      normalized = normalized.replace(new RegExp(smart, "g"), regular);
    }
  }

  // Replace typographic characters
  if (opts.typographicChars) {
    for (const [typographic, regular] of Object.entries(
      NORMALIZATION_MAPS.TYPOGRAPHIC,
    )) {
      normalized = normalized.replace(new RegExp(typographic, "g"), regular);
    }
  }

  // Normalize whitespace (only if explicitly requested)
  if (opts.extraWhitespace) {
    normalized = normalized.replace(/\s+/g, " ");
  }

  // Trim whitespace (only if explicitly requested)
  if (opts.trim) {
    normalized = normalized.trim();
  }

  return normalized;
}

/**
 * Unescapes common HTML entities in a string.
 * Useful for handling AI-generated content that might escape special characters.
 *
 * @param text The string containing HTML entities to unescape
 * @returns The unescaped string with HTML entities converted to their literal characters
 *
 * @example
 * ```typescript
 * unescapeHtmlEntities('&lt;div&gt;') // Returns '<div>'
 * unescapeHtmlEntities('&quot;hello&quot;') // Returns '"hello"'
 * ```
 */
export function unescapeHtmlEntities(text: string): string {
  if (!text) {
    return text;
  }

  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#91;/g, "[")
    .replace(/&#93;/g, "]")
    .replace(/&lsqb;/g, "[")
    .replace(/&rsqb;/g, "]")
    .replace(/&amp;/g, "&"); // Must be last to avoid double-unescaping
}
