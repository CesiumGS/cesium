/*global define*/
define(['../Core/defineProperties'], function(defineProperties) {
    "use strict";

    //A Property that always returns undefined.

    var UndefinedProperty = function() {
    };

    UndefinedProperty.prototype.getValue = function(time, result) {
        return undefined;
    };

    return UndefinedProperty;
});
