/*global define*/
define([
        '../Core/CylinderGeometry',
        '../Core/defined'
    ], function(
        CylinderGeometry,
        defined) {
    "use strict";

    return function(cylinderGeometry) {
        if (defined(cylinderGeometry.buffer)) {
            cylinderGeometry = CylinderGeometry.unpack(cylinderGeometry);
        }
        return CylinderGeometry.createGeometry(cylinderGeometry);
    };
});
