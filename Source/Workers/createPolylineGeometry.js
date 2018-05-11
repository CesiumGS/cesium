define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineGeometry) {
    'use strict';

    function createPolylineGeometry(polylineGeometry, offset) {
        if (defined(offset)) {
            polylineGeometry = PolylineGeometry.unpack(polylineGeometry, offset);
        }
        polylineGeometry._ellipsoid = Ellipsoid.clone(polylineGeometry._ellipsoid);
        return PolylineGeometry.createGeometry(polylineGeometry);
    }

    return createPolylineGeometry;
});
