/**
 * Records keyed by outside strings (CS-847's rule 4): a batch's
 * `properties` and `columns`, a sample's `values`, a patch's `properties`.
 * Their keys come from a source, a feed or a sample, so a key may be
 * `__proto__`, `constructor` or `toString`. Such a record is read through
 * `own` alone, and one is made from entries (`Object.fromEntries`), never
 * by a computed write: so a key reaches only its own property, never a
 * prototype. test/seams.test.ts names the line of any other computed access
 * to a string-keyed record under src/source/.
 */

/** `record[name]` when `name` is its own property, else undefined. */
export function own<T>(
  record: Readonly<Record<string, T>> | undefined,
  name: string,
): T | undefined {
  return record !== undefined && Object.hasOwn(record, name)
    ? record[name]
    : undefined;
}
