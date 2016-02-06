/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineVolumeOutlineGeometry) {
    'use strict';

    function createPolylineVolumeOutlineGeometry(polylineVolumeOutlineGeometry, offset) {
        if (defined(offset)) {
            polylineVolumeOutlineGeometry = PolylineVolumeOutlineGeometry.unpack(polylineVolumeOutlineGeometry, offset);
        }
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);
        return PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
    }

    return createPolylineVolumeOutlineGeometry;
});
