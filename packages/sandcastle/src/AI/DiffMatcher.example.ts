/**
 * Example usage of the DiffMatcher class
 *
 * This file demonstrates how to use the DiffMatcher to find code sections
 * with various matching strategies.
 */

import { DiffMatcher } from "./DiffMatcher";
import { MatchStrategy } from "./types";

// Create an instance of DiffMatcher
const matcher = new DiffMatcher();

// Example 1: Exact matching
const sourceCode = `
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`;

const searchText = `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

const exactMatch = matcher.findMatch(searchText, sourceCode);
console.log("Exact match:", exactMatch?.strategy); // "exact"

// Example 2: Whitespace-normalized matching
const sourceWithTabs = `
function\tcalculateTotal(items)\t{
\treturn\titems.reduce((sum,\titem)\t=>\tsum\t+\titem.price,\t0);
}
`;

const normalizedMatch = matcher.findMatch(searchText, sourceWithTabs);
console.log("Normalized match:", normalizedMatch?.strategy); // "whitespace_normalized"

// Example 3: Fuzzy matching with typos
const sourceWithTypo = `
function calculateTotl(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`;

const fuzzyMatch = matcher.findMatch(searchText, sourceWithTypo, {
  strategies: [MatchStrategy.FUZZY],
  minConfidence: 0.85,
});
console.log("Fuzzy match:", fuzzyMatch?.confidence); // ~0.97

// Example 4: Context-based matching
const contextSource = `
function calculateTotal(items) {
  // Implementation changed but context remains
  return items.map(i => i.price).reduce((a, b) => a + b, 0);
}
`;

const contextMatch = matcher.findMatch(searchText, contextSource, {
  strategies: [MatchStrategy.CONTEXT_BASED],
  minConfidence: 0.8,
  contextLines: 1,
});
console.log("Context match:", contextMatch?.strategy); // "context_based"

// Example 5: Custom strategy order
matcher.findMatch(searchText, sourceCode, {
  strategies: [MatchStrategy.FUZZY, MatchStrategy.EXACT],
  minConfidence: 0.9,
  caseSensitive: false,
});

// Example 6: Using helper methods
const similarity = matcher.calculateSimilarity("hello world", "hello world!");
console.log("Similarity:", similarity); // ~0.92

const normalized = matcher.normalizeWhitespace(
  "  hello    world  \n  foo   bar  ",
);
console.log("Normalized:", normalized); // "hello world\nfoo bar"

const context = matcher.extractContext(
  "line1\nline2\nline3\nline4\nline5",
  2,
  1,
);
console.log("Context:", context); // "line2\nline3\nline4"
