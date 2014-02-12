/*global define*/
define(['./defined',
        './defineProperties',
        './DeveloperError'
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * A collection of key-value pairs that is stored as a hash for easy
     * lookup but also provides as an array for fast iteration.
     * @alias AssociativeArray
     * @constructor
     */
    var AssociativeArray = function() {
        this._array = [];
        this._hash = {};
    };

    defineProperties(AssociativeArray.prototype, {
        /**
         * Get the number of items in the collection.
         * @memberof AssociativeArray.prototype
         *
         * @returns {Number} The number of items in the collection.
         */
        count : {
            get : function() {
                return this._array.length;
            }
        },
        /**
         * Get an unordered array of all values in the collection.
         * This is a live array that will automatically reflect the values in the collection,
         * it should not be modified directly.
         * @memberof AssociativeArray.prototype
         */
        values : {
            get : function() {
                return this._array;
            }
        }
    });

    /**
     * Associates the provided key with the provided value.  If the key already
     * exists in the array, it is overwritten.
     * @memberof AssociativeArray
     *
     * @param {String} key A unique identifier.
     * @param {Object} value The value to associate with the provided key.
     */
    AssociativeArray.prototype.set = function(key, value) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof key !== 'string') {
            throw new DeveloperError('key is required to be a string.');
        }
        //>>includeEnd('debug');

        this.remove(key);
        this._hash[key] = value;
        this._array.push(value);
    };

    /**
     * Retrieve the value associated with the provided key.
     * @memberof AssociativeArray
     *
     * @param {String} key The key whose value to retrieve.
     * @returns {Object} The associated value, or undefined if the key does not exist in the collection.
     */
    AssociativeArray.prototype.get = function(key) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(key)) {
            throw new DeveloperError('key is required.');
        }
        //>>includeEnd('debug');
        return this._hash[key];
    };

    /**
     * Removes a value from the collection.
     * @memberof AssociativeArray
     *
     * @returns {Boolean} True if the value was removed, false if the key was not in the collection.
     */
    AssociativeArray.prototype.remove = function(key) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(key)) {
            throw new DeveloperError('key is required.');
        }
        //>>includeEnd('debug');

        var hasValue = defined(this._hash[key]);
        if (hasValue) {
            var array = this._array;
            array.splice(array.indexOf(this._hash[key]), 1);
            this._hash[key] = undefined;
        }
        return hasValue;
    };

    /**
     * Clears the collection.
     * @memberof AssociativeArray
     */
    AssociativeArray.prototype.removeAll = function() {
        this._hash = {};
        this._array.length = 0;
    };

    return AssociativeArray;
});
