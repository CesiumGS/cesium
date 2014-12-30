/*global define*/
define([
        '../Core/CylinderOutlineGeometry',
        '../Core/defined'
    ], function(
        CylinderOutlineGeometry,
        defined) {
    "use strict";

    return function(cylinderGeometry, offset) {
        if (defined(offset)) {
            cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry, offset);
        }
        return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
    };
});
