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

    MockProperty.prototype.getReferenceFrame = function() {
        return ReferenceFrame.FIXED;
    };

    return MockProperty;
});
