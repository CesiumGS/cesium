define([
        '../Core/CylinderGeometry',
        '../Core/defined'
    ], function(
        CylinderGeometry,
        defined) {
    'use strict';

    return function(cylinderGeometry, offset) {
        if (defined(offset)) {
            cylinderGeometry = CylinderGeometry.unpack(cylinderGeometry, offset);
        }
        return CylinderGeometry.createGeometry(cylinderGeometry);
    };
});
