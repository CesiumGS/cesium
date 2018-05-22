define([
        '../Core/defined',
        '../Core/GroundLineSegmentGeometry'
    ], function(
        defined,
        GroundLineSegmentGeometry) {
    'use strict';

    function createGroundLineSegmentGeometry(groundPolylineSegmentGeometry, offset) {
        if (defined(offset)) {
            groundPolylineSegmentGeometry = GroundLineSegmentGeometry.unpack(groundPolylineSegmentGeometry, offset);
        }
        return GroundLineSegmentGeometry.createGeometry(groundPolylineSegmentGeometry);
    }

    return createGroundLineSegmentGeometry;
});
