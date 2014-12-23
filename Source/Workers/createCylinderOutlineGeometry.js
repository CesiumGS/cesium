/*global define*/
define([
        '../Core/CylinderOutlineGeometry',
        '../Core/defined'
    ], function(
        CylinderOutlineGeometry,
        defined) {
    "use strict";

    return function(cylinderGeometry) {
        if (defined(cylinderGeometry.buffer)) {
            cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry);
        }
        return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
    };
});
