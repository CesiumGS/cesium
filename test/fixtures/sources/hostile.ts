// One pool of hostile inputs for the seam's invariants (test/sourceSeam.test.ts:
// T2, T3 and T5), so an inlet added later is tried with the same values.
// Nothing here imports engine code: each value is written out, never computed
// from what the engine does.

/**
 * Keys and names a record, a map or a sink may be handed: property names
 * `Object.prototype` holds, the empty string, a numeric one, a lone
 * surrogate and a huge one.
 */
export const HOSTILE_KEYS: readonly string[] = [
  "__proto__",
  "constructor",
  "toString",
  "hasOwnProperty",
  "",
  "0",
  "\ud800",
  "x".repeat(100_000),
];

/** A huge array of one plain key: more than any queue's bound between ticks. */
const HUGE: readonly string[] = new Array<string>(20_001).fill("t1");

/**
 * Values for any field of any push, each the wrong shape for most fields:
 * a string where an array goes (walked as its characters), numbers, `null`,
 * objects that aren't arrays (one array-like), a huge array, and arrays
 * whose entries aren't strings. One may be well formed for some field (a
 * string for a `version`, the huge array for `keys`); the oracle holds
 * either way.
 */
export const HOSTILE_VALUES: readonly unknown[] = [
  "t1",
  5,
  Number.NaN,
  null,
  { length: 1, 0: "t1" },
  { t1: true },
  HUGE,
  [1, null, {}],
  ["t1", 7],
  [["t1"]],
];
