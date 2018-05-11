define([
        './defineProperties'
    ], function(
        defineProperties) {
    'use strict';

    /**
     * A queue that can enqueue items at the end, and dequeue items from the front.
     *
     * @alias Queue
     * @constructor
     */
    function Queue() {
        this._array = [];
        this._offset = 0;
        this._length = 0;
    }

    defineProperties(Queue.prototype, {
        /**
         * The length of the queue.
         *
         * @memberof Queue.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._length;
            }
        }
    });

    /**
     * Enqueues the specified item.
     *
     * @param {*} item The item to enqueue.
     */
    Queue.prototype.enqueue = function(item) {
        this._array.push(item);
        this._length++;
    };

    /**
     * Dequeues an item.  Returns undefined if the queue is empty.
     *
     * @returns {*} The the dequeued item.
     */
    Queue.prototype.dequeue = function() {
        if (this._length === 0) {
            return undefined;
        }

        var array = this._array;
        var offset = this._offset;
        var item = array[offset];
        array[offset] = undefined;

        offset++;
        if ((offset > 10) && (offset * 2 > array.length)) {
            //compact array
            this._array = array.slice(offset);
            offset = 0;
        }

        this._offset = offset;
        this._length--;

        return item;
    };

    /**
     * Returns the item at the front of the queue.  Returns undefined if the queue is empty.
     *
     * @returns {*} The item at the front of the queue.
     */
    Queue.prototype.peek = function() {
        if (this._length === 0) {
            return undefined;
        }

        return this._array[this._offset];
    };

    /**
     * Check whether this queue contains the specified item.
     *
     * @param {*} item The item to search for.
     */
    Queue.prototype.contains = function(item) {
        return this._array.indexOf(item) !== -1;
    };

    /**
     * Remove all items from the queue.
     */
    Queue.prototype.clear = function() {
        this._array.length = this._offset = this._length = 0;
    };

    /**
     * Sort the items in the queue in-place.
     *
     * @param {Queue~Comparator} compareFunction A function that defines the sort order.
     */
    Queue.prototype.sort = function(compareFunction) {
        if (this._offset > 0) {
            //compact array
            this._array = this._array.slice(this._offset);
            this._offset = 0;
        }

        this._array.sort(compareFunction);
    };

    /**
     * A function used to compare two items while sorting a queue.
     * @callback Queue~Comparator
     *
     * @param {*} a An item in the array.
     * @param {*} b An item in the array.
     * @returns {Number} Returns a negative value if <code>a</code> is less than <code>b</code>,
     *          a positive value if <code>a</code> is greater than <code>b</code>, or
     *          0 if <code>a</code> is equal to <code>b</code>.
     *
     * @example
     * function compareNumbers(a, b) {
     *     return a - b;
     * }
     */

    return Queue;
});
