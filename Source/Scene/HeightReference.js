/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    var HeightReference = {
        NONE : 0,
        CLAMP_TO_GROUND : 1,
        RELATIVE_TO_GROUND : 2
    };

    return freezeObject(HeightReference);
});
