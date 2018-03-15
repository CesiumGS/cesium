define([
        './defined',
        './defineProperties'
    ], function(
        defined,
        defineProperties) {
    'use strict';

    /**
     * @private
     */
    function DoublyLinkedList() {
        this.head = undefined;
        this.tail = undefined;
        this._length = 0;
    }

    defineProperties(DoublyLinkedList.prototype, {
        length : {
            get : function() {
                return this._length;
            }
        }
    });

    function DoublyLinkedListNode(item, previous, next) {
        this.item = item;
        this.previous  = previous;
        this.next = next;
    }

    /**
     * Adds the item to the end of the list
     * @param {Object} [item]
     * @return {DoublyLinkedListNode}
     */
    DoublyLinkedList.prototype.add = function(item) {
        var node = new DoublyLinkedListNode(item, this.tail, undefined);

        if (defined(this.tail)) {
            this.tail.next = node;
            this.tail = node;
        } else {
            this.head = node;
            this.tail = node;
        }

        ++this._length;

        return node;
    };

    /**
     * Adds the item to the front of the list
     * @param {Object} [item]
     * @return {DoublyLinkedListNode}
     */
    DoublyLinkedList.prototype.addFront = function(item) {
        var node = new DoublyLinkedListNode(item, undefined, this.head);

        if (defined(this.head)) {
            this.head.previous = node;
            this.head = node;
        } else {
            this.head = node;
            this.tail = node;
        }

        ++this._length;

        return node;
    };

    /**
     * Moves the given node to the front of the list
     * @param {DoublyLinkedListNode} node
     */
    DoublyLinkedList.prototype.moveToFront = function(node) {
        if (!defined(node) || this.head === node) {
            return;
        }

        remove(this, node);
        node.next = this.head;
        node.previous = undefined;
        this.head.previous = node;
        this.head = node;
    };

    function remove(list, node) {
        if (defined(node.previous) && defined(node.next)) {
            node.previous.next = node.next;
            node.next.previous = node.previous;
        } else if (defined(node.previous)) {
            // Remove last node
            node.previous.next = undefined;
            list.tail = node.previous;
        } else if (defined(node.next)) {
            // Remove first node
            node.next.previous = undefined;
            list.head = node.next;
        } else {
            // Remove last node in the linked list
            list.head = undefined;
            list.tail = undefined;
        }

        node.next = undefined;
        node.previous = undefined;
    }

    /**
     * Removes the given node from the list
     * @param {DoublyLinkedListNode} node
     */
    DoublyLinkedList.prototype.remove = function(node) {
        if (!defined(node)) {
            return;
        }

        remove(this, node);

        --this._length;
    };

    /**
     * Removes all nodes after the start index (inclusive)
     * @param {Number} startIndex The index of the first node to remove
     */
    DoublyLinkedList.prototype.removeAfter = function(startIndex) {
        var currentLength = this._length;
        if (!defined(startIndex) || startIndex >= currentLength) {
            return;
        }

        if (startIndex === 0) {
            this.head = undefined;
            this.tail = undefined;
            this._length = 0;
            return;
        }

        if (startIndex === currentLength - 1) {
            this.remove(this.tail);
            return;
        }

        var node = this.head;
        for (var i = 0; i < startIndex; ++i) {
            node = node.next;
        }

        node.previous.next = undefined;
        this.tail = node.previous;
        this._length = startIndex;
    };

    /**
     * Moves nextNode after node
     * @param {DoublyLinkedListNode} node
     * @param {DoublyLinkedListNode} nextNode
     */
    DoublyLinkedList.prototype.splice = function(node, nextNode) {
        if (node === nextNode) {
            return;
        }

        // Remove nextNode, then insert after node
        remove(this, nextNode);

        var oldNodeNext = node.next;
        node.next = nextNode;

        // nextNode is the new tail
        if (this.tail === node) {
            this.tail = nextNode;
        } else {
            oldNodeNext.previous = nextNode;
        }

        nextNode.next = oldNodeNext;
        nextNode.previous = node;
    };

    return DoublyLinkedList;
});
