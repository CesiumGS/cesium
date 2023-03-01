import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";

/**
 * Array implementation of a heap.
 *
 * @alias Heap
 * @constructor
 * @private
 *
 * @param {object} options Object with the following properties:
 * @param {Heap.ComparatorCallback} options.comparator The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
 */
function Heap(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.defined("options.comparator", options.comparator);
  //>>includeEnd('debug');

  this._comparator = options.comparator;
  this._array = [];
  this._length = 0;
  this._maximumLength = undefined;
}

Object.defineProperties(Heap.prototype, {
  /**
   * Gets the length of the heap.
   *
   * @memberof Heap.prototype
   *
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._length;
    },
  },

  /**
   * Gets the internal array.
   *
   * @memberof Heap.prototype
   *
   * @type {Array}
   * @readonly
   */
  internalArray: {
    get: function () {
      return this._array;
    },
  },

  /**
   * Gets and sets the maximum length of the heap.
   *
   * @memberof Heap.prototype
   *
   * @type {number}
   */
  maximumLength: {
    get: function () {
      return this._maximumLength;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("maximumLength", value, 0);
      //>>includeEnd('debug');
      const originalLength = this._length;
      if (value < originalLength) {
        const array = this._array;
        // Remove trailing references
        for (let i = value; i < originalLength; ++i) {
          array[i] = undefined;
        }
        this._length = value;
        array.length = value;
      }
      this._maximumLength = value;
    },
  },

  /**
   * The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
   *
   * @memberof Heap.prototype
   *
   * @type {Heap.ComparatorCallback}
   */
  comparator: {
    get: function () {
      return this._comparator;
    },
  },
});

function swap(array, a, b) {
  const temp = array[a];
  array[a] = array[b];
  array[b] = temp;
}

/**
 * Resizes the internal array of the heap.
 *
 * @param {number} [length] The length to resize internal array to. Defaults to the current length of the heap.
 */
Heap.prototype.reserve = function (length) {
  length = defaultValue(length, this._length);
  this._array.length = length;
};

/**
 * Update the heap so that index and all descendants satisfy the heap property.
 *
 * @param {number} [index=0] The starting index to heapify from.
 */
Heap.prototype.heapify = function (index) {
  index = defaultValue(index, 0);
  const length = this._length;
  const comparator = this._comparator;
  const array = this._array;
  let candidate = -1;
  let inserting = true;

  while (inserting) {
    const right = 2 * (index + 1);
    const left = right - 1;

    if (left < length && comparator(array[left], array[index]) < 0) {
      candidate = left;
    } else {
      candidate = index;
    }

    if (right < length && comparator(array[right], array[candidate]) < 0) {
      candidate = right;
    }
    if (candidate !== index) {
      swap(array, candidate, index);
      index = candidate;
    } else {
      inserting = false;
    }
  }
};

/**
 * Resort the heap.
 */
Heap.prototype.resort = function () {
  const length = this._length;
  for (let i = Math.ceil(length / 2); i >= 0; --i) {
    this.heapify(i);
  }
};

/**
 * Insert an element into the heap. If the length would grow greater than maximumLength
 * of the heap, extra elements are removed.
 *
 * @param {*} element The element to insert
 *
 * @return {*} The element that was removed from the heap if the heap is at full capacity.
 */
Heap.prototype.insert = function (element) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("element", element);
  //>>includeEnd('debug');

  const array = this._array;
  const comparator = this._comparator;
  const maximumLength = this._maximumLength;

  let index = this._length++;
  if (index < array.length) {
    array[index] = element;
  } else {
    array.push(element);
  }

  while (index !== 0) {
    const parent = Math.floor((index - 1) / 2);
    if (comparator(array[index], array[parent]) < 0) {
      swap(array, index, parent);
      index = parent;
    } else {
      break;
    }
  }

  let removedElement;

  if (defined(maximumLength) && this._length > maximumLength) {
    removedElement = array[maximumLength];
    this._length = maximumLength;
  }

  return removedElement;
};

/**
 * Remove the element specified by index from the heap and return it.
 *
 * @param {number} [index=0] The index to remove.
 * @returns {*} The specified element of the heap.
 */
Heap.prototype.pop = function (index) {
  index = defaultValue(index, 0);
  if (this._length === 0) {
    return undefined;
  }
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.lessThan("index", index, this._length);
  //>>includeEnd('debug');

  const array = this._array;
  const root = array[index];
  swap(array, index, --this._length);
  this.heapify(index);
  array[this._length] = undefined; // Remove trailing reference
  return root;
};

/**
 * The comparator to use for the heap.
 * @callback Heap.ComparatorCallback
 * @param {*} a An element in the heap.
 * @param {*} b An element in the heap.
 * @returns {number} If the result of the comparison is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
 */
export default Heap;
