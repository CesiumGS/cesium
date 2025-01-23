/**
 * @example
 * if (Cesium.defined(positions)) {
 *      doSomething();
 * } else {
 *      doSomethingElse();
 * }
 * @param value - The object.
 * @returns Returns true if the object is defined, returns false otherwise.
 */
export default function defined<Type>(value: Type): value is NonNullable<Type>;
