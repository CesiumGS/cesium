/*global define*/
define([
        '../Core/defined',
        '../Core/SphereGeometry'
    ], function(
        defined,
        SphereGeometry) {
    "use strict";

    return function(sphereGeometry) {
        if (defined(sphereGeometry.buffer)) {
            sphereGeometry = SphereGeometry.unpack(sphereGeometry);
        }
        return SphereGeometry.createGeometry(sphereGeometry);
    };
});
