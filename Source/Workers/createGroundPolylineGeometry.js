define([
        '../Core/defined',
        '../Core/GroundPolylineGeometry'
    ], function(
        defined,
        GroundPolylineGeometry) {
    'use strict';

    function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
        if (defined(offset)) {
            groundPolylineGeometry = GroundPolylineGeometry.unpack(groundPolylineGeometry, offset);
        }
        return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
    }

    return createGroundPolylineGeometry;
});
