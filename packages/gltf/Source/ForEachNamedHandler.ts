/**
 * A function called with each value of a keyed collection. A defined return value stops the iteration.
 *
 * @param value - The value.
 * @param name - The key of the value.
 *
 * @private
 */
export type ForEachNamedHandler = (value: any, name: string) => any;
