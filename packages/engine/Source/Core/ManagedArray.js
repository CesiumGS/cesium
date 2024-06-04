import Check from "./Check.js";
import defaultValue from "./defaultValue.js";

/**
 * A wrapper around arrays so that the internal length of the array can be manually managed.
 *
 * @alias ManagedArray
 * @constructor
 * @private
 *
 * @param {number} [length=0] The initial length of the array.
 */
function ManagedArray(length) {
  length = defaultValue(length, 0);
  this._array = new Array(length);
  this._length = length;
}

Object.defineProperties(ManagedArray.prototype, {
  /**
   * Gets or sets the length of the array.
   * If the set length is greater than the length of the internal array, the internal array is resized.
   *
   * @memberof ManagedArray.prototype
   * @type {number}
   */
  length: {
    get: function () {
      return this._length;
    },
    set: function (length) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("length", length, 0);
      //>>includeEnd('debug');
      const array = this._array;
      const originalLength = this._length;
      if (length < originalLength) {
        // Remove trailing references
        for (let i = length; i < originalLength; ++i) {
          array[i] = undefined;
        }
      } else if (length > array.length) {
        array.length = length;
      }
      this._length = length;
    },
  },

  /**
   * Gets the internal array.
   *
   * @memberof ManagedArray.prototype
   * @type {Array}
   * @readonly
   */
  values: {
    get: function () {
      return this._array;
    },
  },
});

/**
 * Gets the element at an index.
 *
 * @param {number} index The index to get.
 */
ManagedArray.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.lessThan("index", index, this._array.length);
  //>>includeEnd('debug');

  return this._array[index];
};

/**
 * Sets the element at an index. Resizes the array if index is greater than the length of the array.
 *
 * @param {number} index The index to set.
 * @param {*} element The element to set at index.
 */
ManagedArray.prototype.set = function (index, element) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  if (index >= this._length) {
    this.length = index + 1;
  }
  this._array[index] = element;
};

/**
 * Returns the last element in the array without modifying the array.
 *
 * @returns {*} The last element in the array.
 */
ManagedArray.prototype.peek = function () {
  return this._array[this._length - 1];
};

/**
 * Push an element into the array.
 *
 * @param {*} element The element to push.
 */
ManagedArray.prototype.push = function (element) {
  const index = this.length++;
  this._array[index] = element;
};

/**
 * Pop an element from the array.
 *
 * @returns {*} The last element in the array.
 */
ManagedArray.prototype.pop = function () {
  if (this._length === 0) {
    return undefined;
  }
  const element = this._array[this._length - 1];
  --this.length;
  return element;
};

/**
 * Resize the internal array if length > _array.length.
 *
 * @param {number} length The length.
 */
ManagedArray.prototype.reserve = function (length) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("length", length, 0);
  //>>includeEnd('debug');

  if (length > this._array.length) {
    this._array.length = length;
  }
};

/**
 * Resize the array.
 *
 * @param {number} length The length.
 */
ManagedArray.prototype.resize = function (length) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("length", length, 0);
  //>>includeEnd('debug');

  this.length = length;
};

/**
 * Trim the internal array to the specified length. Defaults to the current length.
 *
 * @param {number} [length] The length.
 */
ManagedArray.prototype.trim = function (length) {
  length = defaultValue(length, this._length);
  this._array.length = length;
};
export default ManagedArray;
