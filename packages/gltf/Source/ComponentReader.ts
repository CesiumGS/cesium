/**
 * A function that reads consecutive components from a DataView into an array.
 *
 * @param dataView - The data view to read from.
 * @param byteOffset - The byte offset applied when reading from the data view.
 * @param numberOfComponents - The number of components to read.
 * @param result - An array storing the components that are read.
 *
 * @internal
 */
export type ComponentReader = (
  dataView: DataView,
  byteOffset: number,
  numberOfComponents: number,
  result: number[],
) => void;
