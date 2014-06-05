/*global define*/
define(function() {
    "use strict";

    /**
     * A queue that can enqueue items at the end, and dequeue items from the front.
     *
     * @alias Queue
     * @constructor
     */
    var Queue = function() {
        this._array = [];
        this._offset = 0;

        /**
         * The length of the queue.
         */
        this.length = 0;
    };

    /**
     * Enqueues the specified item.
     *
     * @param {Object} item The item to enqueue.
     */
    Queue.prototype.enqueue = function(item) {
        this._array.push(item);
        this.length++;
    };

    /**
     * Dequeues an item.  Returns undefined if the queue is empty.
     */
    Queue.prototype.dequeue = function() {
        if (this.length === 0) {
            return undefined;
        }

        var array = this._array;
        var offset = this._offset;
        var item = array[offset];
        array[offset] = undefined;

        offset++;
        if (offset > 10 && offset * 2 > array.length) {
            //compact array
            this._array = array.slice(offset);
            offset = 0;
        }

        this._offset = offset;
        this.length--;

        return item;
    };

    /**
     * Check whether this queue contains the specified item.
     *
     * @param {Object} item the item to search for.
     */
    Queue.prototype.contains = function(item) {
        return this._array.indexOf(item) !== -1;
    };

    /**
     * Remove all items from the queue.
     */
    Queue.prototype.clear = function() {
        this._array.length = this._offset = this.length = 0;
    };

    /**
     * Sort the items in the queue in-place.
     *
     * @param {Function} compareFunction a function that defines the sort order.
     */
    Queue.prototype.sort = function(compareFunction) {
        if (this._offset > 0) {
            //compact array
            this._array = this._array.slice(this._offset);
            this._offset = 0;
        }

        this._array.sort(compareFunction);
    };

    return Queue;
});