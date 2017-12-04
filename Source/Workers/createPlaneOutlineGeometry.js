define([
        '../Core/PlaneOutlineGeometry',
        '../Core/defined'
    ], function(
        PlaneOutlineGeometry,
        defined) {
    'use strict';

    return function(planeGeometry, offset) {
        if (defined(offset)) {
            planeGeometry = PlaneOutlineGeometry.unpack(planeGeometry, offset);
        }
        return PlaneOutlineGeometry.createGeometry(planeGeometry);
    };
});
