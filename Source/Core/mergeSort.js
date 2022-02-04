import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

const leftScratchArray = [];
const rightScratchArray = [];

function merge(array, compare, userDefinedObject, start, middle, end) {
  const leftLength = middle - start + 1;
  const rightLength = end - middle;

  const left = leftScratchArray;
  const right = rightScratchArray;

  let i;
  let j;

  for (i = 0; i < leftLength; ++i) {
    left[i] = array[start + i];
  }

  for (j = 0; j < rightLength; ++j) {
    right[j] = array[middle + j + 1];
  }

  i = 0;
  j = 0;
  for (let k = start; k <= end; ++k) {
    const leftElement = left[i];
    const rightElement = right[j];
    if (
      i < leftLength &&
      (j >= rightLength ||
        compare(leftElement, rightElement, userDefinedObject) <= 0)
    ) {
      array[k] = leftElement;
      ++i;
    } else if (j < rightLength) {
      array[k] = rightElement;
      ++j;
    }
  }
}

function sort(array, compare, userDefinedObject, start, end) {
  if (start >= end) {
    return;
  }

  const middle = Math.floor((start + end) * 0.5);
  sort(array, compare, userDefinedObject, start, middle);
  sort(array, compare, userDefinedObject, middle + 1, end);
  merge(array, compare, userDefinedObject, start, middle, end);
}

/**
 * A stable merge sort.
 *
 * @function mergeSort
 * @param {Array} array The array to sort.
 * @param {mergeSortComparator} comparator The function to use to compare elements in the array.
 * @param {*} [userDefinedObject] Any item to pass as the third parameter to <code>comparator</code>.
 *
 * @example
 * // Assume array contains BoundingSpheres in world coordinates.
 * // Sort them in ascending order of distance from the camera.
 * const position = camera.positionWC;
 * Cesium.mergeSort(array, function(a, b, position) {
 *     return Cesium.BoundingSphere.distanceSquaredTo(b, position) - Cesium.BoundingSphere.distanceSquaredTo(a, position);
 * }, position);
 */
function mergeSort(array, comparator, userDefinedObject) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required.");
  }
  if (!defined(comparator)) {
    throw new DeveloperError("comparator is required.");
  }
  //>>includeEnd('debug');

  const length = array.length;
  const scratchLength = Math.ceil(length * 0.5);

  // preallocate space in scratch arrays
  leftScratchArray.length = scratchLength;
  rightScratchArray.length = scratchLength;

  sort(array, comparator, userDefinedObject, 0, length - 1);

  // trim scratch arrays
  leftScratchArray.length = 0;
  rightScratchArray.length = 0;
}

/**
 * A function used to compare two items while performing a merge sort.
 * @callback mergeSortComparator
 *
 * @param {*} a An item in the array.
 * @param {*} b An item in the array.
 * @param {*} [userDefinedObject] An object that was passed to {@link mergeSort}.
 * @returns {Number} Returns a negative value if <code>a</code> is less than <code>b</code>,
 *          a positive value if <code>a</code> is greater than <code>b</code>, or
 *          0 if <code>a</code> is equal to <code>b</code>.
 *
 * @example
 * function compareNumbers(a, b, userDefinedObject) {
 *     return a - b;
 * }
 */
export default mergeSort;
