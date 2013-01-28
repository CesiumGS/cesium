/*global define*/
define(['Core/ReferenceFrame'], function(ReferenceFrame) {
    "use strict";

    function MockProperty(value) {
        this.value = value;
    }

    MockProperty.prototype.getValue = function() {
        return this.value;
    };

    MockProperty.prototype.getValueCartesian = function() {
        return this.value;
    };

    MockProperty.prototype.getValueSpherical = function() {
        return this.value;
    };

    MockProperty.prototype._getReferenceFrame = function() {
        return ReferenceFrame.FIXED;
    };

    MockProperty.prototype.getValueRangeCartesian = function(start, stop, currentTime, result) {
        this.lastStart = start;
        this.lastStop = stop;
        this.lastCurrentTime = currentTime;
        return this.value;
    };

    MockProperty.prototype._getValueRangeInReferenceFrame = MockProperty.prototype.getValueRangeCartesian;

    return MockProperty;
});