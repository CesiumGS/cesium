define([
        '../Core/defined',
        '../Core/FrustumOutlineGeometry'
    ], function(
        defined,
        FrustumOutlineGeometry) {
    'use strict';

    function createFrustumOutlineGeometry(frustumGeometry, offset) {
        if (defined(offset)) {
            frustumGeometry = FrustumOutlineGeometry.unpack(frustumGeometry, offset);
        }
        return FrustumOutlineGeometry.createGeometry(frustumGeometry);
    }

    return createFrustumOutlineGeometry;
});
