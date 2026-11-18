// @ts-check

/**
 * A queue that can enqueue items at the end, and dequeue items from the front.
 * @template T = unknown
 */
class Queue {
  constructor() {
    /** @type {Array<T>} */
    this._array = [];
    this._offset = 0;
    this._length = 0;
  }

  /**
   * The length of the queue.
   *
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._length;
  }

  /**
   * Enqueues the specified item.
   *
   * @param {T} item The item to enqueue.
   */
  enqueue(item) {
    this._array.push(item);
    this._length++;
  }

  /**
   * Dequeues an item.  Returns undefined if the queue is empty.
   *
   * @returns {T} The the dequeued item.
   */
  dequeue() {
    if (this._length === 0) {
      return undefined;
    }

    const array = this._array;
    let offset = this._offset;
    const item = array[offset];
    array[offset] = undefined;

    offset++;
    if (offset > 10 && offset * 2 > array.length) {
      //compact array
      this._array = array.slice(offset);
      offset = 0;
    }

    this._offset = offset;
    this._length--;

    return item;
  }

  /**
   * Returns the item at the front of the queue.  Returns undefined if the queue is empty.
   *
   * @returns {T} The item at the front of the queue.
   */
  peek() {
    if (this._length === 0) {
      return undefined;
    }

    return this._array[this._offset];
  }

  /**
   * Check whether this queue contains the specified item.
   *
   * @param {T} item The item to search for.
   */
  contains(item) {
    return this._array.indexOf(item) !== -1;
  }

  /**
   * Remove all items from the queue.
   */
  clear() {
    this._array.length = this._offset = this._length = 0;
  }

  /**
   * Sort the items in the queue in-place.
   *
   * @param {(a: T, b: T) => number} compareFunction A function that defines the sort order.
   *  Returns a negative value if <code>a</code> is less than <code>b</code>, a positive
   *  value if <code>a</code> is greater than <code>b</code>, or 0 if <code>a</code> is equal
   *  to <code>b</code>.
   */
  sort(compareFunction) {
    if (this._offset > 0) {
      //compact array
      this._array = this._array.slice(this._offset);
      this._offset = 0;
    }

    this._array.sort(compareFunction);
  }
}

export default Queue;
