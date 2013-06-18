/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/binarySearch',
        '../Core/HermitePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/LagrangePolynomialApproximation'
    ], function(
        DeveloperError,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        binarySearch,
        HermitePolynomialApproximation,
        LinearApproximation,
        LagrangePolynomialApproximation) {
    "use strict";

    var StaticProperty = function(value) {
        this._value = value;
    };

    StaticProperty.prototype.getValue = function(time, result) {
        var value = this._value;
        if (typeof value.clone === 'function') {
            return value.clone(result);
        }
        return value;
    };

    StaticProperty.prototype.setValue = function(value) {
        this._value = value;
    };

    return StaticProperty;
});