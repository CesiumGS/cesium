define([
        './defined',
        './defineProperties',
        './DeveloperError',
        './DoublyLinkedList',
        './getTimestamp'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        DoublyLinkedList,
        getTimestamp) {
    'use strict';

    /**
     * A cache for storing key-value pairs
     * @param {Number} [capacity] The capacity of the cache.  If undefined, the size will be unlimited.
     * @param {Number} [expiration] The number of milliseconds before an item in the cache expires and will be discarded when LRUCache.prune is called.  If undefined, items do not expire.
     * @alias LRUCache
     * @constructor
     * @private
     */
    function LRUCache(capacity, expiration) {
        this._list = new DoublyLinkedList();
        this._hash = {};
        this._hasCapacity = defined(capacity);
        this._capacity = capacity;

        this._hasExpiration = defined(expiration);
        this._expiration = expiration;
        this._interval = undefined;
    }

    defineProperties(LRUCache.prototype, {
        /**
         * Gets the cache length
         * @memberof LRUCache.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._list.length;
            }
        }
    });

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
            if (this._hasExpiration) {
                LRUCache._checkExpiration(this);
            }
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

    function prune(cache) {
        var currentTime = getTimestamp();
        var pruneAfter = currentTime - cache._expiration;

        var list = cache._list;
        var node = list.tail;
        var index = list.length;
        while (defined(node) && node.item.timestamp < pruneAfter) {
            node = node.previous;
            index--;
        }

        if (node === list.tail) {
            return;
        }

        if (!defined(node)) {
            node = list.head;
        } else {
            node = node.next;
        }

        while (defined(node)) {
            delete cache._hash[node.item.key];
            node = node.next;
        }

        list.removeAfter(index);
    }

    function checkExpiration(cache) {
        if (defined(cache._interval)) {
            return;
        }
        function loop() {
            if (!cache._hasExpiration || cache.length === 0) {
                clearInterval(cache._interval);
                cache._interval = undefined;
                return;
            }

            prune(cache);

            if (cache.length === 0) {
                clearInterval(cache._interval);
                cache._interval = undefined;
            }
        }
        cache._interval = setInterval(loop, 1000);
    }

    function Item(key, value) {
        this.key = key;
        this.value = value;
        this.timestamp = getTimestamp();
    }

    Item.prototype.touch = function() {
        this.timestamp = getTimestamp();
    };

    //exposed for testing
    LRUCache._checkExpiration = checkExpiration;
    LRUCache._prune = prune;

    return LRUCache;
});
