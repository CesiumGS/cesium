define([
        '../Core/defined',
        '../Core/FrustumGeometry'
    ], function(
        defined,
        FrustumGeometry) {
    'use strict';

    function createFrustumGeometry(frustumGeometry, offset) {
        if (defined(offset)) {
            frustumGeometry = FrustumGeometry.unpack(frustumGeometry, offset);
        }
        return FrustumGeometry.createGeometry(frustumGeometry);
    }

    return createFrustumGeometry;
});
