/*global define*/
define([
        'Core/defined',
        'Core/ReferenceFrame'
    ], function(
        defined,
        ReferenceFrame) {
    "use strict";

    function MockProperty(value) {
        this.value = value;
    }

    MockProperty.prototype.getValue = function(time, result) {
        if (defined(this.value) && typeof this.value.clone === 'function') {
            return this.value.clone(result);
        }
        return this.value;
    };

    MockProperty.prototype._getReferenceFrame = function() {
        return ReferenceFrame.FIXED;
    };

    MockProperty.prototype._getValueRangeInReferenceFrame = function(start, stop, currentTime, result) {
        this.lastStart = start;
        this.lastStop = stop;
        this.lastCurrentTime = currentTime;
        return this.value;
    };

    return MockProperty;
});
