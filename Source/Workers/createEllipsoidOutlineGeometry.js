/*global define*/
define([
        '../Core/defined',
        '../Core/EllipsoidOutlineGeometry'
    ], function(
        defined,
        EllipsoidOutlineGeometry) {
    "use strict";

    return function(ellipsoidGeometry) {
        if (defined(ellipsoidGeometry.buffer)) {
            ellipsoidGeometry = EllipsoidOutlineGeometry.unpack(ellipsoidGeometry);
        }
        return EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
    };
});
