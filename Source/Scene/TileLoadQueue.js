/*global define*/
define(function() {
    "use strict";

    function TileLoadQueue() {
        this.head = undefined;
        this.tail = undefined;
        this._insertionPoint = undefined;
    }

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

    TileLoadQueue.prototype.markInsertionPoint = function(item) {
        this._insertionPoint = this.head;
    };

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
            if (typeof this.head === 'undefined') {
                item.loadPrevious = undefined;
                item.loadNext = undefined;
                this.head = item;
                this.tail = item;
            } else {
                item.loadPrevious = this.tail;
                item.loadNext = undefined;
                this.tail.loadNext = item;
                this.tail = item;
            }
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
