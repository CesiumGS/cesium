/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineVolumeOutlineGeometry) {
    "use strict";

    function createPolylineVolumeOutlineGeometry(polylineVolumeOutlineGeometry) {
        if (defined(polylineVolumeOutlineGeometry.buffer)) {
            polylineVolumeOutlineGeometry = PolylineVolumeOutlineGeometry.unpack(polylineVolumeOutlineGeometry);
        }
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);
        return PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
    }

    return createPolylineVolumeOutlineGeometry;
});
