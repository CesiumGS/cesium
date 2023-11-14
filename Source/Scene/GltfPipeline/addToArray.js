import defaultValue from "../../Core/defaultValue.js";

/**
 * Adds an element to an array and returns the element's index.
 *
 * @param {Array} array The array to add to.
 * @param {Object} element The element to add.
 * @param {Boolean} [checkDuplicates=false] When <code>true</code>, if a duplicate element is found its index is returned and <code>element</code> is not added to the array.
 *
 * @private
 */
function addToArray(array, element, checkDuplicates) {
  checkDuplicates = defaultValue(checkDuplicates, false);
  if (checkDuplicates) {
    const index = array.indexOf(element);
    if (index > -1) {
      return index;
    }
  }

  array.push(element);
  return array.length - 1;
}

export default addToArray;
