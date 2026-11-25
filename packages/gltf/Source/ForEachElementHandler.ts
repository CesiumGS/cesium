/**
 * A function called with each glTF object. A defined return value stops the iteration.
 *
 * @param element - The glTF object.
 * @param index - The element's index, or its id in glTF 1.0.
 *
 * @internal
 */
export type ForEachElementHandler = (
  element: any,
  index: number | string,
) => any;
