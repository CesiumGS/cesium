/*global define*/
define([], function() {
    "use strict";

    function TileLoadQueue() {
        this.head = undefined;
        this.tail = undefined;
        this._insertionPoint = undefined;
    }

    TileLoadQueue.prototype.remove = function(item) {
        var previous = item._previous;
        var next = item._next;

        if (item === this.head) {
            this.head = next;
        } else {
            previous._next = next;
        }

        if (item === this.tail) {
            this.tail = previous;
        } else {
            next._previous = previous;
        }

        item._previous = undefined;
        item._next = undefined;
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
            item._previous = undefined;
            item._next = undefined;
            this.head = item;
            this.tail = item;
            return;
        }

        if (typeof item._previous !== 'undefined' || typeof item._next !== 'undefined') {
            // tile already in the list, remove from its current location
            this.remove(item);
        }

        if (typeof insertionPoint === 'undefined') {
            if (typeof this.head === 'undefined') {
                item._previous = undefined;
                item._next = undefined;
                this.head = item;
                this.tail = item;
            } else {
                item._previous = this.tail;
                item._next = undefined;
                this.tail._next = item;
                this.tail = item;
            }
            return;
        }

        var insertAfter = insertionPoint._previous;
        item._previous = insertAfter;
        if (typeof insertAfter !== 'undefined') {
            insertAfter._next = item;
        }

        item._next = insertionPoint;
        insertionPoint._previous = item;

        if (insertionPoint === this.head) {
            this.head = item;
        }
    };

    return TileLoadQueue;
});
