/*global define*/
define([
        '../Core/defined',
        '../Core/SphereOutlineGeometry'
    ], function(
        defined,
        SphereOutlineGeometry) {
    "use strict";

    return function(sphereGeometry) {
        if (defined(sphereGeometry.buffer)) {
            sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry);
        }
        return SphereOutlineGeometry.createGeometry(sphereGeometry);
    };
});
