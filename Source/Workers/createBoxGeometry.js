/*global define*/
define([
        '../Core/BoxGeometry',
        '../Core/defined'
    ], function(
        BoxGeometry,
        defined) {
    "use strict";

    return function(boxGeometry) {
        if (defined(boxGeometry.buffer)) {
            boxGeometry = BoxGeometry.unpack(boxGeometry);
        }
        return BoxGeometry.createGeometry(boxGeometry);
    };
});
