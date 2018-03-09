define([
    './defined',
    './getTimestamp',
    './DeveloperError',
    './DoublyLinkedList'
], function(
    defined,
    getTimestamp,
    DeveloperError,
    DoublyLinkedList) {
    'use strict';

    function Item (key, value) {
        this.key = key;
        this.value = value;
        this.timestamp = getTimestamp();
    }

    Item.prototype.touch = function() {
        this.timestamp = getTimestamp();
    };

    /**
     * A cache for storing key-value pairs
     * @param {Number} [capacity] The capacity of the cache.  If undefined, the size will be unlimited.
     * @param {Number} [expiration] The number of milliseconds before an item in the cache expires and will be discarded when LRUCache.prune is called.  If undefined, items do not expire.
     * @alias AssociativeArray
     * @constructor
     */
    function LRUCache(capacity, expiration) {
        this._list = new DoublyLinkedList();
        this._hash = {};
        this._hasCapacity = defined(capacity);
        this._capacity = capacity;
        this._hasExpiration = defined(expiration);
        this._expiration = expiration;
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
            var item = node.item;
            item.touch();
            return item.value;
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
        var item;
        if (!defined(node)) {
            item = new Item(key, value);
            node = list.addFront(item);
            hash[key] = node;
            if (this._hasCapacity && list.length > this._capacity) {
                var tail = list.tail;
                delete this._hash[tail.item.key];
                list.remove(tail);
            }
        } else {
            item = node.item;
            item.value = value;
            item.touch();
            list.moveToFront(node);
        }
    };

    /**
     * Removes expired items from the cache.
     */
    LRUCache.prototype.prune = function() {
        if (!this._hasExpiration || this._list.length === 0) {
            return;
        }

        var currentTime = getTimestamp();
        var pruneAfter = currentTime - this._expiration;

        var list = this._list;
        var node = list.head;
        var index = 0;
        while (defined(node) && node.item.timestamp > pruneAfter) {
            node = node.next;
            index++;
        }

        if (!defined(node)) {
            return;
        }

        list.removeAfter(index);

        while(defined(node)) {
            delete this._hash[node.item.key];
            node = node.next;
        }
    };

    return LRUCache;
});
