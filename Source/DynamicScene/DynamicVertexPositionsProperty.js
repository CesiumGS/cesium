/*global define*/
define(function() {
    "use strict";

    function DynamicVertexPositionsProperty() {
    }

    DynamicVertexPositionsProperty.prototype._getValue = function(time) {
        return undefined;
    };

    DynamicVertexPositionsProperty.prototype.getValueCartographic = function(time) {
        var result = this._getValue(time);
        if (typeof result !== undefined) {
        }
        return result;
    };

    DynamicVertexPositionsProperty.prototype.getValueCartesian = function(time) {
        var result = this._getValue(time);
        if (typeof result !== undefined) {
        }
        return result;
    };

    DynamicVertexPositionsProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri) {
    };

    DynamicVertexPositionsProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri) {
    };

    return DynamicVertexPositionsProperty;
});