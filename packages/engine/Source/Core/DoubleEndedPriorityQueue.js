import CesiumMath from "./Math.js";
import Check from "./Check.js";
import defined from "./defined.js";

/**
 * Array-backed min-max heap implementation of a double-ended priority queue.
 * This data structure allows for efficient removal of minimum and maximum elements.
 *
 * @alias DoubleEndedPriorityQueue
 * @constructor
 * @private
 *
 * @param {object} options Object with the following properties:
 * @param {DoubleEndedPriorityQueue.ComparatorCallback} options.comparator The comparator to use for the queue. If comparator(a, b) is less than 0, a is lower priority than b.
 * @param {number} [options.maximumLength] The maximum length of the queue. If an element is inserted when the queue is at full capacity, the minimum element is removed. By default, the size of the queue is unlimited.
 */
function DoubleEndedPriorityQueue(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.defined("options.comparator", options.comparator);
  if (defined(options.maximumLength)) {
    Check.typeOf.number.greaterThanOrEquals(
      "options.maximumLength",
      options.maximumLength,
      0
    );
  }
  //>>includeEnd('debug');

  this._comparator = options.comparator;
  this._maximumLength = options.maximumLength;
  this._array = defined(options.maximumLength)
    ? new Array(options.maximumLength)
    : [];
  this._length = 0;
}

Object.defineProperties(DoubleEndedPriorityQueue.prototype, {
  /**
   * Gets the number of elements in the queue.
   *
   * @memberof DoubleEndedPriorityQueue.prototype
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
   * Gets or sets the maximum number of elements in the queue.
   * If set to a smaller value than the current length of the queue, the lowest priority elements are removed.
   * If an element is inserted when the queue is at full capacity, the minimum element is removed.
   * If set to undefined, the size of the queue is unlimited.
   *
   * @memberof DoubleEndedPriorityQueue.prototype
   *
   * @type {number}
   * @readonly
   */
  maximumLength: {
    get: function () {
      return this._maximumLength;
    },
    set: function (value) {
      if (defined(value)) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals("maximumLength", value, 0);
        //>>includeEnd('debug');

        // Remove elements until the maximum length is met.
        while (this._length > value) {
          this.removeMinimum();
        }

        // The array size is fixed to the maximum length
        this._array.length = value;
      }
      this._maximumLength = value;
    },
  },

  /**
   * Gets the internal array.
   *
   * @memberof DoubleEndedPriorityQueue.prototype
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
   * The comparator used by the queue.
   * If comparator(a, b) is less than 0, a is lower priority than b.
   *
   * @memberof DoubleEndedPriorityQueue.prototype
   *
   * @type {DoubleEndedPriorityQueue.ComparatorCallback}
   * @readonly
   */
  comparator: {
    get: function () {
      return this._comparator;
    },
  },
});

/**
 * Clones the double ended priority queue.
 *
 * @returns {DoubleEndedPriorityQueue} The cloned double ended priority queue.
 */
DoubleEndedPriorityQueue.prototype.clone = function () {
  const maximumLength = this._maximumLength;
  const comparator = this._comparator;
  const array = this._array;
  const length = this._length;

  const result = new DoubleEndedPriorityQueue({
    comparator: comparator,
    maximumLength: maximumLength,
  });

  result._length = length;
  for (let i = 0; i < length; i++) {
    result._array[i] = array[i];
  }

  return result;
};

/**
 * Removes all elements from the queue.
 */
DoubleEndedPriorityQueue.prototype.reset = function () {
  this._length = 0;

  // Dereference elements
  const maximumLength = this._maximumLength;
  if (defined(maximumLength)) {
    // Dereference all elements but keep the array the same size
    for (let i = 0; i < maximumLength; i++) {
      this._array[i] = undefined;
    }
  } else {
    // Dereference all elements by clearing the array
    this._array.length = 0;
  }
};

/**
 * Resort the queue.
 */
DoubleEndedPriorityQueue.prototype.resort = function () {
  const length = this._length;

  // Fix the queue from the top-down
  for (let i = 0; i < length; i++) {
    pushUp(this, i);
  }
};

/**
 * Inserts an element into the queue.
 * If the queue is at full capacity, the minimum element is removed.
 * The new element is returned (and not added) if it is less than or equal priority to the minimum element.
 *
 * @param {*} element
 * @returns {*|undefined} The minimum element if the queue is at full capacity. Returns undefined if there is no maximum length.
 */
DoubleEndedPriorityQueue.prototype.insert = function (element) {
  let removedElement;

  const maximumLength = this._maximumLength;
  if (defined(maximumLength)) {
    if (maximumLength === 0) {
      return undefined;
    } else if (this._length === maximumLength) {
      // It's faster to access the minimum directly instead of calling the getter
      // because it avoids the length === 0 check.
      const minimumElement = this._array[0];
      if (this._comparator(element, minimumElement) <= 0.0) {
        // The element that is being inserted is less than or equal to
        // the minimum element, so don't insert anything and exit early.
        return element;
      }
      removedElement = this.removeMinimum();
    }
  }

  const index = this._length;
  this._array[index] = element;
  this._length++;
  pushUp(this, index);

  return removedElement;
};

/**
 * Removes the minimum element from the queue and returns it.
 * If the queue is empty, the return value is undefined.
 *
 * @returns {*|undefined} The minimum element, or undefined if the queue is empty.
 */
DoubleEndedPriorityQueue.prototype.removeMinimum = function () {
  const length = this._length;
  if (length === 0) {
    return undefined;
  }

  this._length--;

  // The minimum element is always the root
  const minimumElement = this._array[0];

  if (length >= 2) {
    this._array[0] = this._array[length - 1];
    pushDown(this, 0);
  }

  // Dereference removed element
  this._array[length - 1] = undefined;

  return minimumElement;
};

/**
 * Removes the maximum element from the queue and returns it.
 * If the queue is empty, the return value is undefined.
 *
 * @returns {*|undefined} The maximum element, or undefined if the queue is empty.
 */
DoubleEndedPriorityQueue.prototype.removeMaximum = function () {
  const length = this._length;
  if (length === 0) {
    return undefined;
  }

  this._length--;
  let maximumElement;

  // If the root has no children, the maximum is the root.
  // If the root has one child, the maximum is the child.
  if (length <= 2) {
    maximumElement = this._array[length - 1];
  } else {
    // Otherwise, the maximum is the larger of the root's two children.
    const maximumElementIndex = greaterThan(this, 1, 2) ? 1 : 2;
    maximumElement = this._array[maximumElementIndex];

    // Re-balance the heap
    this._array[maximumElementIndex] = this._array[length - 1];
    if (length >= 4) {
      pushDown(this, maximumElementIndex);
    }
  }

  // Dereference removed element
  this._array[length - 1] = undefined;

  return maximumElement;
};

/**
 * Gets the minimum element in the queue.
 * If the queue is empty, the result is undefined.
 *
 * @returns {*|undefined} element
 */

DoubleEndedPriorityQueue.prototype.getMinimum = function () {
  const length = this._length;
  if (length === 0) {
    return undefined;
  }

  // The minimum element is always the root
  return this._array[0];
};

/**
 * Gets the maximum element in the queue.
 * If the queue is empty, the result is undefined.
 *
 * @returns {*|undefined} element
 */
DoubleEndedPriorityQueue.prototype.getMaximum = function () {
  const length = this._length;
  if (length === 0) {
    return undefined;
  }

  // If the root has no children, the maximum is the root.
  // If the root has one child, the maximum is the child.
  if (length <= 2) {
    return this._array[length - 1];
  }

  // Otherwise, the maximum is the larger of the root's two children.
  return this._array[greaterThan(this, 1, 2) ? 1 : 2];
};

// Helper functions

function swap(that, indexA, indexB) {
  const array = that._array;
  const temp = array[indexA];
  array[indexA] = array[indexB];
  array[indexB] = temp;
}

function lessThan(that, indexA, indexB) {
  return that._comparator(that._array[indexA], that._array[indexB]) < 0.0;
}

function greaterThan(that, indexA, indexB) {
  return that._comparator(that._array[indexA], that._array[indexB]) > 0.0;
}

function pushUp(that, index) {
  if (index === 0) {
    return;
  }
  const onMinLevel = Math.floor(CesiumMath.log2(index + 1)) % 2 === 0;
  const parentIndex = Math.floor((index - 1) / 2);
  const lessThanParent = lessThan(that, index, parentIndex);

  // Get the element onto the correct level if it's not already
  if (lessThanParent !== onMinLevel) {
    swap(that, index, parentIndex);
    index = parentIndex;
  }

  // Swap element with grandparent as long as it:
  // 1) has a grandparent
  // 2A) is less than the grandparent when on a min level
  // 2B) is greater than the grandparent when on a max level
  while (index >= 3) {
    const grandparentIndex = Math.floor((index - 3) / 4);
    if (lessThan(that, index, grandparentIndex) !== lessThanParent) {
      break;
    }
    swap(that, index, grandparentIndex);
    index = grandparentIndex;
  }
}

function pushDown(that, index) {
  const length = that._length;
  const onMinLevel = Math.floor(CesiumMath.log2(index + 1)) % 2 === 0;

  // Loop as long as there is a left child.
  let leftChildIndex;
  while ((leftChildIndex = 2 * index + 1) < length) {
    // Find the minimum (or maximum) child or grandchild
    let target = leftChildIndex;
    const rightChildIndex = leftChildIndex + 1;
    if (rightChildIndex < length) {
      if (lessThan(that, rightChildIndex, target) === onMinLevel) {
        target = rightChildIndex;
      }
      const grandChildStart = 2 * leftChildIndex + 1;
      const grandChildCount = Math.max(
        Math.min(length - grandChildStart, 4),
        0
      );
      for (let i = 0; i < grandChildCount; i++) {
        const grandChildIndex = grandChildStart + i;
        if (lessThan(that, grandChildIndex, target) === onMinLevel) {
          target = grandChildIndex;
        }
      }
    }

    // Swap the element into the correct spot
    if (lessThan(that, target, index) === onMinLevel) {
      swap(that, target, index);
      if (target !== leftChildIndex && target !== rightChildIndex) {
        const parentOfGrandchildIndex = Math.floor((target - 1) / 2);
        if (greaterThan(that, target, parentOfGrandchildIndex) === onMinLevel) {
          swap(that, target, parentOfGrandchildIndex);
        }
      }
    }

    index = target;
  }
}

/**
 * The comparator to use for the queue.
 * @callback DoubleEndedPriorityQueue.ComparatorCallback
 * @param {*} a An element in the queue.
 * @param {*} b An element in the queue.
 * @returns {number} If the result of the comparison is less than 0, a is lower priority than b.
 */
export default DoubleEndedPriorityQueue;
