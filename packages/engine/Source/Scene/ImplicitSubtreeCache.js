import Frozen from "../Core/Frozen.js";
import DeveloperError from "../Core/DeveloperError.js";
import DoubleEndedPriorityQueue from "../Core/DoubleEndedPriorityQueue.js";

/**
 * @alias ImplicitSubtreeCache
 * @constructor
 *
 * @param {object} [options] Object with the following properties
 * @param {number} [options.maximumSubtreeCount=0] The total number of subtrees this cache can store. If adding a new subtree would exceed this limit, the lowest priority subtrees will be removed until there is room, unless the subtree that is going to be removed is the parent of the new subtree, in which case it will not be removed and the new subtree will still be added, exceeding the memory limit.
 *
 * @private
 */
function ImplicitSubtreeCache(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * @type {number}
   * @private
   */
  this._maximumSubtreeCount = options.maximumSubtreeCount ?? 0;

  /**
   * A counter that goes up whenever a subtree is added. Used to sort subtrees by recency.
   * @type {number}
   * @private
   */
  this._subtreeRequestCounter = 0;

  /**
   * @type {DoubleEndedPriorityQueue}
   * @private
   */
  this._queue = new DoubleEndedPriorityQueue({
    comparator: ImplicitSubtreeCache.comparator,
  });
}

/**
 * @param {ImplicitSubtree} subtree
 */
ImplicitSubtreeCache.prototype.addSubtree = function (subtree) {
  const cacheNode = new ImplicitSubtreeCacheNode(
    subtree,
    this._subtreeRequestCounter,
  );
  this._subtreeRequestCounter++;
  this._queue.insert(cacheNode);

  // Make sure the parent subtree exists in the cache
  const subtreeCoord = subtree.implicitCoordinates;
  if (subtreeCoord.level > 0) {
    const parentCoord = subtreeCoord.getParentSubtreeCoordinates();
    const parentNode = this.find(parentCoord);

    //>>includeStart('debug', pragmas.debug)
    if (parentNode === undefined) {
      throw new DeveloperError("parent node needs to exist");
    }
    //>>includeEnd('debug');
  }

  if (this._maximumSubtreeCount > 0) {
    while (this._queue.length > this._maximumSubtreeCount) {
      const lowestPriorityNode = this._queue.getMinimum();
      if (lowestPriorityNode === cacheNode) {
        // Don't remove itself
        break;
      }

      this._queue.removeMinimum();
    }
  }
};

/**
 * @param {ImplicitTileCoordinates} subtreeCoord
 * @returns {ImplicitSubtree|undefined}
 */
ImplicitSubtreeCache.prototype.find = function (subtreeCoord) {
  const queue = this._queue;
  const array = queue.internalArray;
  const arrayLength = queue.length;

  for (let i = 0; i < arrayLength; i++) {
    const other = array[i];
    const otherSubtree = other.subtree;
    const otherCoord = otherSubtree.implicitCoordinates;
    if (subtreeCoord.isEqual(otherCoord)) {
      return other.subtree;
    }
  }
  return undefined;
};

/**
 * @param {ImplicitSubtreeCacheNode} a
 * @param {ImplicitSubtreeCacheNode} b
 * @returns {number}
 */
ImplicitSubtreeCache.comparator = function (a, b) {
  const aCoord = a.subtree.implicitCoordinates;
  const bCoord = b.subtree.implicitCoordinates;
  if (aCoord.isAncestor(bCoord)) {
    // Technically this shouldn't happen because the ancestor subtree was supposed to be added to the cache first.
    return +1.0;
  } else if (bCoord.isAncestor(aCoord)) {
    return -1.0;
  }
  return a.stamp - b.stamp;
};

/**
 * @alias ImplicitSubtreeCacheNode
 * @constructor
 *
 * @param {ImplicitSubtree} subtree
 * @param {number} stamp
 *
 * @private
 */
function ImplicitSubtreeCacheNode(subtree, stamp) {
  this.subtree = subtree;
  this.stamp = stamp;
}

export default ImplicitSubtreeCache;
