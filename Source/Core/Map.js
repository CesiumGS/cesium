/*global define*/
define(['./defined',
        './DeveloperError'
    ], function(
        defined, DeveloperError) {
    "use strict";

    var Map = function() {
        this._array = [];
        this._hash = {};
    };

    Map.prototype.set = function(key, value) {
        this._hash[key] = value;
        this._array.push(value);
    };

    Map.prototype.get = function(key) {
        return this._hash[key];
    };

    Map.prototype.getValues = function() {
        return this._array;
    };

    Map.prototype.remove = function(key) {
        var hasValue = defined(this._hash[key]);
        if (hasValue) {
            var array = this._array;
            array.splice(array.indexOf(this._hash[key]), 1);
            this._hash[key] = undefined;
        }
        return hasValue;
    };

    Map.prototype.removeAll = function() {
        this._hash = {};
        this._array.length = 0;
    };

    return Map;
});
