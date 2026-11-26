// @ts-check

/*
 * This file is an implementation detail of Conditional3DTileContent.
 * It should not be used by other classes.
 */

import { DeveloperError } from "@cesium/core";

/**
 *
 * Implementation of an LRU (least recently used) cache.
 *
 * Calling the 'get' or 'set' function constitutes "using" the
 * respective key. When 'set' is called and this causes the
 * size of the cache to grow beyond its maximum size, then
 * the least recently used element will be evicted.
 *
 * It is possible to create a cache with an infinite maximum
 * size. In this case, the 'trimToSize' method can be used
 * to manually trim the cache to a certain size.
 *
 * The implementation resembles that of a Map
 *
 * @template K
 * @template V
 * @internal
 */
class LRUCache {
  /**
   * Creates a new instance with the given maximum size.
   *
   * @param {number} maximumSize The maximum size
   * @param {Function|undefined} evictionCallback The callback that will
   * receive the key and value of all evicted entries.
   * @throws {DeveloperError} If the maximum size is not positive
   */
  constructor(maximumSize, evictionCallback) {
    if (maximumSize <= 0) {
      throw new DeveloperError(
        `The maximumSize must be positive, but is ${maximumSize}`,
      );
    }
    this._maximumSize = maximumSize;
    this._evictionCallback = evictionCallback;

    /**
     * The backing map
     *
     * @type {Map<K, V>}
     * @readonly
     */
    this._map = new Map();
  }

  /**
   * Set the maximum size that this cache may have.
   *
   * If the new maximum size is smaller than the current size
   * of this cache, then the least recently used elements will
   * be evicted until the size matches the maximum size.
   *
   * @param {number} maximumSize The maximum size
   * @throws {DeveloperError} If the maximum size is not positive
   */
  setMaximumSize(maximumSize) {
    if (maximumSize <= 0) {
      throw new DeveloperError(
        `The maximumSize must be positive, but is ${maximumSize}`,
      );
    }
    this._maximumSize = maximumSize;
    this._ensureMaximumSize();
  }

  // Returns the current size of this map
  //
  // @type {number} The size
  //
  // This should be a JSDoc comment, but then, "build-ts" bails out.
  get size() {
    return this._map.size;
  }

  /**
   * Set the value for the given key.
   *
   * @param {K} key The key
   * @param {V} value The value
   */
  set(key, value) {
    this._map.delete(key);
    this._map.set(key, value);
    this._ensureMaximumSize();
  }

  /**
   * Trim this cache to the given size.
   *
   * While the size is larger than the given size, the oldest
   * (least recently used) elements will be evicted.
   *
   * @param {number} newSize The new size
   */
  trimToSize(newSize) {
    while (this.size > newSize) {
      const oldestEntry = this._map.entries().next().value;
      const oldestKey = oldestEntry[0];
      this._map.delete(oldestKey);
      if (this._evictionCallback !== undefined) {
        const oldestValue = oldestEntry[1];
        this._evictionCallback(oldestKey, oldestValue);
      }
    }
  }

  /**
   * Ensure that the number of elements in this cache is not
   * larger than the maximum size.
   *
   * This will evict as many entries as necessary, in the
   * order of their least recent usage.
   */
  _ensureMaximumSize() {
    this.trimToSize(this._maximumSize);
  }

  /**
   * Get the value for the given key.
   *
   * Returns <code>undefined</code> if there is no entry for this key.
   *
   * @param {K} key The key
   * @returns {V|undefined} The value
   */
  get(key) {
    if (this._map.has(key)) {
      const value = this._map.get(key);

      // Remove the entry and add it again, to put it
      // at the end of the map (most recently used)
      this._map.delete(key);
      this._map.set(key, value);
      return value;
    }
    return undefined;
  }

  /**
   * Returns whether an entry exists for the given key.
   *
   * @param {K} key The key
   * @returns {boolean} Whether the entry exists
   */
  has(key) {
    return this._map.has(key);
  }

  /**
   * Delete the entry from the given key, if it exists.
   *
   * @param {K} key The key
   */
  delete(key) {
    this._map.delete(key);
  }

  /**
   * Clear this map, removing all entries.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Returns the keys of this map
   *
   * @returns {Iterable<K>} The keys
   */
  keys() {
    return this._map.keys();
  }

  /**
   * Returns the values of this map
   *
   * @returns {Iterable<V>} The values
   */
  values() {
    return this._map.values();
  }

  /**
   * Returns the entries of this map
   *
   * @returns {Iterable<any>} The entries
   */
  entries() {
    return this._map.entries();
  }

  /**
   * Call the given function on each key/value pair
   *
   * @param {any} callback The callback
   * @param {any} thisArg A value to use as this when executing the callback
   */
  forEach(callback, thisArg) {
    this._map.forEach(callback, thisArg);
  }

  /**
   * Returns an iterator over the elements of this cache.
   *
   * @returns {Iterator<any>} The iterator
   */
  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
}

export default LRUCache;
