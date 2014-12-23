/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        '../Core/defined'
    ], function(
        BoxOutlineGeometry,
        defined) {
    "use strict";

    return function(boxGeometry) {
        if (defined(boxGeometry.buffer)) {
            boxGeometry = BoxOutlineGeometry.unpack(boxGeometry);
        }
        return BoxOutlineGeometry.createGeometry(boxGeometry);
    };
});
