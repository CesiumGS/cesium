define([
    './defined',
    './DeveloperError',
    './DoublyLinkedList'
], function(
    defined,
    DeveloperError,
    DoublyLinkedList) {
    'use strict';

    /**
     * A cache for storing key-value pairs
     * @param {Number} [capacity] The capacity of the cache.  If undefined, the size will be unlimited.
     * @alias AssociativeArray
     * @constructor
     */
    function LRUCache(capacity) {
        this._list = new DoublyLinkedList();
        this._hash = {};
        this._hasCapacity = defined(capacity);
        this._capacity = capacity;
    }

    /**
     * Retrieves the value associated with the provided key.
     *
     * @param {String|Number} key The key whose value is to be retrieved.
     * @returns {Object} The associated value, or undefined if the key does not exist in the collection.
     */
    LRUCache.prototype.get = function(key) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof key !== 'string' && typeof key !== 'number') {
            throw new DeveloperError('key is required to be a string or number.');
        }
        //>>includeEnd('debug');
        var list = this._list;
        var node = this._hash[key];
        if (defined(node)) {
            list.moveToFront(node);
            return node.item;
        }
    };

    /**
     * Associates the provided key with the provided value.  If the key already
     * exists, it is overwritten with the new value.
     *
     * @param {String|Number} key A unique identifier.
     * @param {Object} value The value to associate with the provided key.
     */
    LRUCache.prototype.set = function(key, value) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof key !== 'string' && typeof key !== 'number') {
            throw new DeveloperError('key is required to be a string or number.');
        }
        //>>includeEnd('debug');
        var hash = this._hash;
        var list = this._list;

        var node = hash[key];
        if (!defined(node)) {
            node = list.addFront(value);
            node._key = key;
            hash[key] = node;
            if (this._hasCapacity && list.length > this._capacity) {
                var tail = list.tail;
                delete this._hash[tail._key];
                list.remove(tail);
            }
        } else {
            node.item = value;
            list.moveToFront(node);
        }
    };

    return LRUCache;
});
