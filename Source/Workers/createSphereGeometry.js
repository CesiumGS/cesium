/*global define*/
define([
        '../Core/defined',
        '../Core/SphereGeometry'
    ], function(
        defined,
        SphereGeometry) {
    "use strict";

    return function(sphereGeometry, offset) {
        if (defined(offset)) {
            sphereGeometry = SphereGeometry.unpack(sphereGeometry, offset);
        }
        return SphereGeometry.createGeometry(sphereGeometry);
    };
});
