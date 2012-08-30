/*global define*/
define([
        './DeveloperError',
        './destroyObject'
    ], function(
        DeveloperError,
        destroyObject) {
    "use strict";

    /**
     * A software cache implementation.
     *
     * @alias Cache
     *
     * @constructor
     *
     * @param {Object} policy A cache replacement policy.
     *
     * @exception {DeveloperError} policy is required.
     * @exception {DeveloperError} policy.hit must be a function.
     * @exception {DeveloperError} policy.miss must be a function.
     *
     * @see CachePolicy.LRU
     */
    var Cache = function(policy) {
        if (!policy) {
            throw new DeveloperError('policy is required.');
        }

        if (!policy.hit || typeof policy.hit !== 'function') {
            throw new DeveloperError('policy.hit must be a function.');
        }

        if (!policy.miss || typeof policy.miss !== 'function') {
            throw new DeveloperError('policy.miss must be a function.');
        }

        this._cache = {};
        this._policy = policy;
    };

    /**
     * Returns the object at key in the cache. It is the responsibility of the cache replacement policy
     * to fetch items not stored in the cache, which will be stored in the cache and returned.
     *
     * @memberof Cache
     *
     * @param {Object} key The key of the object to remove from the cache.
     *
     * @exception {DeveloperError} key is required.
     * @exception {DeveloperError} key must be a string, have a string property called 'key', or
     * have a function called 'getKey' that returns a string.
     *
     * @return {Object} The object stored in the cache at <code>key</code>.
     *
     * @see Cache#remove
     */
    Cache.prototype.find = function(key) {
        if (!key) {
            throw new DeveloperError('key is required.');
        }

        var name = key;
        if (typeof key !== 'string') {
            name = key.key || (key.getKey && key.getKey());
        }

        if (!name) {
            throw new DeveloperError('key must be a string, or an object with a string key property or getKey function.');
        }

        var element = this._cache[name];
        if (element) {
            return this._policy.hit(element);
        }

        return this._policy.miss(name, key, this._cache);
    };

    /**
     * Removes the object at key from the cache.
     *
     * @memberof Cache
     *
     * @param {Object} key The key of the object to remove from the cache.
     *
     * @return {Boolean} <code>true</code> is the object was removed from the cache, <code>false</code>
     * if the object was not found and not removed.
     *
     * @see Cache#find
     */
    Cache.prototype.remove = function(key) {
        if (!key) {
            return false;
        }

        var name = key;
        if (typeof key !== 'string') {
            name = key.key || (key.getKey && key.getKey());
        }

        if (!name) {
            return false;
        }

        if (this._cache[name]) {
            delete this._cache[name];
            return true;
        }

        return false;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Cache
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Cache#destroy
     */
    Cache.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Cache
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Cache#isDestroyed
     *
     * @example
     * cache = cache && cache.destroy();
     */
    Cache.prototype.destroy = function() {
        var keys = Object.keys(this._cache);
        for ( var i = 0; i < keys.length; ++i) {
            var e = keys[i];
            if (e && e.isDestroyed && !e.isDestroyed() && e.destroy) {
                e.destroy();
            }
        }
        return destroyObject(this);
    };

    return Cache;
});
