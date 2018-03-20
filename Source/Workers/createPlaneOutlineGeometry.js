define([
        '../Core/defined',
        '../Core/PlaneOutlineGeometry'
    ], function(
        defined,
        PlaneOutlineGeometry) {
    'use strict';

    return function(planeGeometry, offset) {
        if (defined(offset)) {
            planeGeometry = PlaneOutlineGeometry.unpack(planeGeometry, offset);
        }
        return PlaneOutlineGeometry.createGeometry(planeGeometry);
    };
});
