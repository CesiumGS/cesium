/*global define*/
define(function() {
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

    MockProperty.prototype.getValueRangeCartesian = function(start, stop, currentTime, result) {
        this.lastStart = start;
        this.lastStop = stop;
        this.lastCurrentTime = currentTime;
        return this.value;
    };

    return MockProperty;
});