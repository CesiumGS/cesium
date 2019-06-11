define([
        '../Core/defined',
        '../Core/PlaneGeometry'
    ], function(
        defined,
        PlaneGeometry) {
    'use strict';

    return function(planeGeometry, offset) {
        if (defined(offset)) {
            planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
        }
        return PlaneGeometry.createGeometry(planeGeometry);
    };
});
