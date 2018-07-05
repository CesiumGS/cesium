define([
        '../Core/defined',
        '../Core/GroundPolylineGeometry',
        '../Scene/GroundPolylinePrimitive'
    ], function(
        defined,
        GroundPolylineGeometry,
        GroundPolylinePrimitive) {
    'use strict';

    function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
        return GroundPolylinePrimitive.initializeTerrainHeights()
            .then(function() {
                if (defined(offset)) {
                    groundPolylineGeometry = GroundPolylineGeometry.unpack(groundPolylineGeometry, offset);
                }
                return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
            });
    }

    return createGroundPolylineGeometry;
});
