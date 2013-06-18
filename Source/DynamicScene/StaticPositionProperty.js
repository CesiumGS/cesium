/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    var StaticPositionProperty = function(value) {
        this._value = value;
    };

    StaticPositionProperty.prototype.getValueCartesian = function(time, result) {
        var value = this._value;
        if (typeof value.clone === 'function') {
            return value.clone(result);
        }
        return value;
    };

    StaticPositionProperty.prototype.setValue = function(value) {
        this._value = value;
    };

    return StaticPositionProperty;
});