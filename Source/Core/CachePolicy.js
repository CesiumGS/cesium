/*global define*/
define([
        './DeveloperError',
        './JulianDate'
    ], function(
        DeveloperError,
        JulianDate) {
    "use strict";

    /**
     * Defines cache replacement policies.
     *
     * @name CachePolicy
     *
     * @see Cache
     */
    var CachePolicy = {};

    /**
     * Least recently used cache replacement policy that replaces the least recently used
     * item from the cache first.
     *
     * @name CachePolicy.LRU
     *
     * @constructor
     *
     * @param {Function} description.fetchFunc A function that given the key will return an object to store in the cache.
     * @param {Function} description.removeFunc A optional function that will be called when the object will be removed from the cache.
     * @param {Number} description.limit  The maximum number of objects that can be stored in the cache, defaults to 128.
     *
     * @exception {DeveloperError} description.fetchFunc is required.
     */
    CachePolicy.LRU = function(description) {
        var desc = description || {};

        if (!desc.fetchFunc || typeof desc.fetchFunc !== 'function') {
            throw new DeveloperError('description.fetchFunc is a required function.');
        }

        this._limit = desc.limit || 128;
        this._count = 0;
        this._fetchFunc = desc.fetchFunc;
        this._removeFunc = (typeof desc.removeFunc === 'function') ? desc.removeFunc : null;
    };

    /**
     * This function is called by the cache when an object is requested and is stored in the cache.
     * Updates the object as used recently.
     *
     * @memberof CachePolicy.LRU
     *
     * @param {Object} object The value stored in the cache that was requested by its key.
     */
    CachePolicy.LRU.prototype.hit = function(object) {
        object.lastHit = new JulianDate();
        return object.value;
    };

    /**
     * This function is called by the cache when an object is requested and is not stored in the cache.
     * Replaces the LRU object with the object returned by the fetch function given to the constructor.
     *
     * @memberof CachePolicy.LRU
     *
     * @param {String} name The string name used as a key into the hash.
     * @param {Object} key The object that was used as a key into the cache;
     * @param {Object} object An object used as a hash table. The key/value pairs are elements store in the cache.
     */
    CachePolicy.LRU.prototype.miss = function(name, key, object) {
        var property = {
            key : key,
            value : null,
            lastHit : null
        };

        property.value = this._fetchFunc(key);
        var lruTime = new JulianDate();
        property.lastHit = lruTime;

        if (this._count < this._limit) {
            ++this._count;
            object[name] = property;
            return property.value;
        }

        var element;
        var index = '';
        var keys = Object.keys(object);
        for ( var i = 0; i < keys.length; ++i) {
            element = object[keys[i]];
            if (element.lastHit.lessThan(lruTime)) {
                lruTime = element.lastHit;
                index = keys[i];
            }
        }
        element = object[index];
        if (this._removeFunc) {
            this._removeFunc(element.key);
        }
        delete object[index];

        object[name] = property;
        return property.value;
    };

    return CachePolicy;
});
