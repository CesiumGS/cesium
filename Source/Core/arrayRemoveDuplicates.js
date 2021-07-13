import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";

var removeDuplicatesEpsilon = CesiumMath.EPSILON10;

/**
 * Removes adjacent duplicate values in an array of values.
 *
 * @param {Array.<*>} [values] The array of values.
 * @param {Function} equalsEpsilon Function to compare values with an epsilon. Boolean equalsEpsilon(left, right, epsilon).
 * @param {Boolean} [wrapAround=false] Compare the last value in the array against the first value. If they are equal, the last value is removed.
 * @param {Array.<number>} [removedIndices=undefined] Store the indices that correspond to the duplicate items removed from the array, if there were any.
 * @returns {Array.<*>|undefined} A new array of values with no adjacent duplicate values or the input array if no duplicates were found.
 *
 * @example
 * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0), (3.0, 3.0, 3.0), (1.0, 1.0, 1.0)]
 * var values = [
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
 *     new Cesium.Cartesian3(3.0, 3.0, 3.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0)];
 * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3.equalsEpsilon);
 *
 * @example
 * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0), (3.0, 3.0, 3.0)]
 * var values = [
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
 *     new Cesium.Cartesian3(3.0, 3.0, 3.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0)];
 * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3.equalsEpsilon, true);
 *
 * @example
 * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0), (3.0, 3.0, 3.0)]
 * // removedIndices will be equal to [1, 3, 5]
 * var values = [
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
 *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
 *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
 *     new Cesium.Cartesian3(3.0, 3.0, 3.0),
 *     new Cesium.Cartesian3(1.0, 1.0, 1.0)];
 * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3.equalsEpsilon, true);
 * @private
 */
function arrayRemoveDuplicates(
  values,
  equalsEpsilon,
  wrapAround,
  removedIndices
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("equalsEpsilon", equalsEpsilon);
  //>>includeEnd('debug');

  if (!defined(values)) {
    return undefined;
  }

  wrapAround = defaultValue(wrapAround, false);

  var storeRemovedIndices = defined(removedIndices);

  var length = values.length;
  if (length < 2) {
    return values;
  }

  var i;
  var v0 = values[0];
  var v1;

  // We only want to create a new array if there are duplicates in the array (without considering wrapAround).
  // As such, cleanedValues is undefined until it encounters the first duplicate, if it exists.
  var cleanedValues;
  var cleanedValuesDefined = false;

  for (i = 1; i < length; ++i) {
    v1 = values[i];
    if (equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
      if (!cleanedValuesDefined) {
        cleanedValues = values.slice(0, i);
        cleanedValuesDefined = true;
      }
      if (storeRemovedIndices) {
        removedIndices.push(i);
      }
    } else {
      if (cleanedValuesDefined) {
        cleanedValues.push(v1);
      }
      v0 = v1;
    }
  }

  if (!cleanedValuesDefined) {
    if (
      wrapAround &&
      equalsEpsilon(
        values[0],
        values[values.length - 1],
        removeDuplicatesEpsilon
      )
    ) {
      if (storeRemovedIndices) {
        removedIndices.push(values.length - 1);
      }
      values.length -= 1;
      return values;
    }
    return values;
  }

  if (
    wrapAround &&
    cleanedValues.length > 1 &&
    equalsEpsilon(
      cleanedValues[0],
      cleanedValues[cleanedValues.length - 1],
      removeDuplicatesEpsilon
    )
  ) {
    if (storeRemovedIndices) {
      removedIndices.push(values.length - 1);
    }
    cleanedValues.length -= 1;
  }

  return cleanedValues;
}
export default arrayRemoveDuplicates;
