define([
        '../Core/defined',
        '../Core/GroundLineGeometry'
    ], function(
        defined,
        GroundLineGeometry) {
    'use strict';

    function createGroundLineGeometry(groundPolylineSegmentGeometry, offset) {
        if (defined(offset)) {
            groundPolylineSegmentGeometry = GroundLineGeometry.unpack(groundPolylineSegmentGeometry, offset);
        }
        return GroundLineGeometry.createGeometry(groundPolylineSegmentGeometry);
    }

    return createGroundLineGeometry;
});
