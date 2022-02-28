import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * A collection of key-value pairs that is stored as a hash for easy
 * lookup but also provides an array for fast iteration.
 * @alias AssociativeArray
 * @constructor
 */
function AssociativeArray() {
  this._array = [];
  this._hash = {};
}

Object.defineProperties(AssociativeArray.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof AssociativeArray.prototype
   *
   * @type {Number}
   */
  length: {
    get: function () {
      return this._array.length;
    },
  },
  /**
   * Gets an unordered array of all values in the collection.
   * This is a live array that will automatically reflect the values in the collection,
   * it should not be modified directly.
   * @memberof AssociativeArray.prototype
   *
   * @type {Array}
   */
  values: {
    get: function () {
      return this._array;
    },
  },
});

/**
 * Determines if the provided key is in the array.
 *
 * @param {String|Number} key The key to check.
 * @returns {Boolean} <code>true</code> if the key is in the array, <code>false</code> otherwise.
 */
AssociativeArray.prototype.contains = function (key) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof key !== "string" && typeof key !== "number") {
    throw new DeveloperError("key is required to be a string or number.");
  }
  //>>includeEnd('debug');
  return defined(this._hash[key]);
};

/**
 * Associates the provided key with the provided value.  If the key already
 * exists, it is overwritten with the new value.
 *
 * @param {String|Number} key A unique identifier.
 * @param {*} value The value to associate with the provided key.
 */
AssociativeArray.prototype.set = function (key, value) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof key !== "string" && typeof key !== "number") {
    throw new DeveloperError("key is required to be a string or number.");
  }
  //>>includeEnd('debug');

  const oldValue = this._hash[key];
  if (value !== oldValue) {
    this.remove(key);
    this._hash[key] = value;
    this._array.push(value);
  }
};

/**
 * Retrieves the value associated with the provided key.
 *
 * @param {String|Number} key The key whose value is to be retrieved.
 * @returns {*} The associated value, or undefined if the key does not exist in the collection.
 */
AssociativeArray.prototype.get = function (key) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof key !== "string" && typeof key !== "number") {
    throw new DeveloperError("key is required to be a string or number.");
  }
  //>>includeEnd('debug');
  return this._hash[key];
};

/**
 * Removes a key-value pair from the collection.
 *
 * @param {String|Number} key The key to be removed.
 * @returns {Boolean} True if it was removed, false if the key was not in the collection.
 */
AssociativeArray.prototype.remove = function (key) {
  //>>includeStart('debug', pragmas.debug);
  if (defined(key) && typeof key !== "string" && typeof key !== "number") {
    throw new DeveloperError("key is required to be a string or number.");
  }
  //>>includeEnd('debug');

  const value = this._hash[key];
  const hasValue = defined(value);
  if (hasValue) {
    const array = this._array;
    array.splice(array.indexOf(value), 1);
    delete this._hash[key];
  }
  return hasValue;
};

/**
 * Clears the collection.
 */
AssociativeArray.prototype.removeAll = function () {
  const array = this._array;
  if (array.length > 0) {
    this._hash = {};
    array.length = 0;
  }
};
export default AssociativeArray;
