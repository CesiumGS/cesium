/**
 * Returns true if the object is defined, returns false otherwise.
 *
 * @param value - The object to check.
 * @returns Returns true if the object is defined, returns false otherwise.
 *
 * @example
 * if (defined(positions)) {
 *     doSomething();
 * } else {
 *     doSomethingElse();
 * }
 */
export function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export default defined;
