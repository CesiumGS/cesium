define([
        '../Core/defined',
        '../Core/SphereOutlineGeometry'
    ], function(
        defined,
        SphereOutlineGeometry) {
    'use strict';

    return function(sphereGeometry, offset) {
        if (defined(offset)) {
            sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
        }
        return SphereOutlineGeometry.createGeometry(sphereGeometry);
    };
});
