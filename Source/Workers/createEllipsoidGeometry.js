/*global define*/
define([
        '../Core/defined',
        '../Core/EllipsoidGeometry'
    ], function(
        defined,
        EllipsoidGeometry) {
    "use strict";

    return function(ellipsoidGeometry) {
        if (defined(ellipsoidGeometry.buffer)) {
            ellipsoidGeometry = EllipsoidGeometry.unpack(ellipsoidGeometry);
        }
        return EllipsoidGeometry.createGeometry(ellipsoidGeometry);
    };
});
