define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineVolumeGeometry) {
    'use strict';

    function createPolylineVolumeGeometry(polylineVolumeGeometry, offset) {
        if (defined(offset)) {
            polylineVolumeGeometry = PolylineVolumeGeometry.unpack(polylineVolumeGeometry, offset);
        }
        polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeGeometry._ellipsoid);
        return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
    }

    return createPolylineVolumeGeometry;
});
