define([
        '../Core/ApproximateTerrainHeights',
        '../Core/defined',
        '../Core/GroundPolylineGeometry'
    ], function(
        ApproximateTerrainHeights,
        defined,
        GroundPolylineGeometry) {
    'use strict';

    function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
        return ApproximateTerrainHeights.initialize()
            .then(function() {
                if (defined(offset)) {
                    groundPolylineGeometry = GroundPolylineGeometry.unpack(groundPolylineGeometry, offset);
                }
                return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
            });
    }

    return createGroundPolylineGeometry;
});
