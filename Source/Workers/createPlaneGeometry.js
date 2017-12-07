define([
        '../Core/PlaneGeometry',
        '../Core/defined'
    ], function(
        PlaneGeometry,
        defined) {
    'use strict';

    return function(planeGeometry, offset) {
        if (defined(offset)) {
            planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
        }
        return PlaneGeometry.createGeometry(planeGeometry);
    };
});
