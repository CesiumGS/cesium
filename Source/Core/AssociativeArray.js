/*global define*/
define(['./defined',
        './DeveloperError'
    ], function(
        defined, DeveloperError) {
    "use strict";

    var AssociativeArray = function() {
        this._array = [];
        this._hash = {};
    };

    AssociativeArray.prototype.set = function(key, value) {
        this.remove(key);
        this._hash[key] = value;
        this._array.push(value);
    };

    AssociativeArray.prototype.get = function(key) {
        return this._hash[key];
    };

    AssociativeArray.prototype.getCount = function() {
        return this._array.length;
    };

    AssociativeArray.prototype.getValues = function() {
        return this._array;
    };

    AssociativeArray.prototype.remove = function(key) {
        var hasValue = defined(this._hash[key]);
        if (hasValue) {
            var array = this._array;
            array.splice(array.indexOf(this._hash[key]), 1);
            this._hash[key] = undefined;
        }
        return hasValue;
    };

    AssociativeArray.prototype.removeAll = function() {
        this._hash = {};
        this._array.length = 0;
    };

    return AssociativeArray;
});
