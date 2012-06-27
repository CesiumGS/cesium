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

    return MockProperty;
});