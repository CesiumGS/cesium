import Check from "./Check.js";

/**
 * A wrapper around arrays so that the internal length of the array can be manually managed.
 *
 * @alias ManagedArray
 * @constructor
 * @private
 *
 * @param {number} [length=0] The initial length of the array.
 */
class ManagedArray {
  constructor(length) {
    length = length ?? 0;
    this._array = new Array(length);
    this._length = length;
  }

  /**
   * Gets or sets the length of the array.
   * If the set length is greater than the length of the internal array, the internal array is resized.
   *
   * @memberof ManagedArray.prototype
   * @type {number}
   */
  get length() {
    return this._length;
  }

  set length(length) {
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
  }

  /**
   * Gets the internal array.
   *
   * @memberof ManagedArray.prototype
   * @type {Array}
   * @readonly
   */
  get values() {
    return this._array;
  }

  /**
   * Gets the element at an index.
   *
   * @param {number} index The index to get.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.lessThan("index", index, this._array.length);
    //>>includeEnd('debug');

    return this._array[index];
  }

  /**
   * Sets the element at an index. Resizes the array if index is greater than the length of the array.
   *
   * @param {number} index The index to set.
   * @param {*} element The element to set at index.
   */
  set(index, element) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("index", index);
    //>>includeEnd('debug');

    if (index >= this._length) {
      this.length = index + 1;
    }
    this._array[index] = element;
  }

  /**
   * Returns the last element in the array without modifying the array.
   *
   * @returns {*} The last element in the array.
   */
  peek() {
    return this._array[this._length - 1];
  }

  /**
   * Push an element into the array.
   *
   * @param {*} element The element to push.
   */
  push(element) {
    const index = this.length++;
    this._array[index] = element;
  }

  /**
   * Pop an element from the array.
   *
   * @returns {*} The last element in the array.
   */
  pop() {
    if (this._length === 0) {
      return undefined;
    }
    const element = this._array[this._length - 1];
    --this.length;
    return element;
  }

  /**
   * Resize the internal array if length > _array.length.
   *
   * @param {number} length The length.
   */
  reserve(length) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("length", length, 0);
    //>>includeEnd('debug');

    if (length > this._array.length) {
      this._array.length = length;
    }
  }

  /**
   * Resize the array.
   *
   * @param {number} length The length.
   */
  resize(length) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("length", length, 0);
    //>>includeEnd('debug');

    this.length = length;
  }

  /**
   * Trim the internal array to the specified length. Defaults to the current length.
   *
   * @param {number} [length] The length.
   */
  trim(length) {
    length = length ?? this._length;
    this._array.length = length;
  }
}

export default ManagedArray;
