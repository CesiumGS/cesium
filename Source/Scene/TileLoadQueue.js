/*global define*/
define(function() {
    "use strict";

    /**
     * A priority queue of tiles to be loaded, implemented as a linked list.
     *
     * @alias TileLoadQueue
     * @private
     */
    var TileLoadQueue = function TileLoadQueue() {
        this.head = undefined;
        this.tail = undefined;
        this._insertionPoint = undefined;
    };

    /**
     * Removes a tile from the load queue.
     *
     * @memberof TileLoadQueue
     *
     * @param {Tile} item The tile to remove from the load queue.
     */
    TileLoadQueue.prototype.remove = function(item) {
        var previous = item.loadPrevious;
        var next = item.loadNext;

        if (item === this.head) {
            this.head = next;
        } else {
            previous.loadNext = next;
        }

        if (item === this.tail) {
            this.tail = previous;
        } else {
            next.loadPrevious = previous;
        }

        item.loadPrevious = undefined;
        item.loadNext = undefined;
    };

    /**
     * Marks the point at which new tiles will be inserted into the queue, which is initially the
     * head of the queue.  As each new tile is added to or repositioned in the queue, the insertion
     * point represents the first tile that was not added or repositioned this frame.
     *
     * @memberof TileLoadQueue
     */
    TileLoadQueue.prototype.markInsertionPoint = function() {
        this._insertionPoint = this.head;
    };

    /**
     * Inserts (or repositions) a tile to place it just before the insertion point.
     *
     * @memberof TileLoadQueue
     *
     * @param {Tile} item The tile to insert or reposition.
     */
    TileLoadQueue.prototype.insertBeforeInsertionPoint = function(item) {
        var insertionPoint = this._insertionPoint;
        if (insertionPoint === item) {
            return;
        }

        if (typeof this.head === 'undefined') {
            // no other tiles in the list
            item.loadPrevious = undefined;
            item.loadNext = undefined;
            this.head = item;
            this.tail = item;
            return;
        }

        if (typeof item.loadPrevious !== 'undefined' || typeof item.loadNext !== 'undefined') {
            // tile already in the list, remove from its current location
            this.remove(item);
        }

        if (typeof insertionPoint === 'undefined') {
            item.loadPrevious = this.tail;
            item.loadNext = undefined;
            this.tail.loadNext = item;
            this.tail = item;
            return;
        }

        var insertAfter = insertionPoint.loadPrevious;
        item.loadPrevious = insertAfter;
        if (typeof insertAfter !== 'undefined') {
            insertAfter.loadNext = item;
        }

        item.loadNext = insertionPoint;
        insertionPoint.loadPrevious = item;

        if (insertionPoint === this.head) {
            this.head = item;
        }
    };

    return TileLoadQueue;
});
