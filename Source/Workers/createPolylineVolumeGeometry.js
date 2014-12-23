/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineVolumeGeometry) {
    "use strict";

    function createPolylineVolumeGeometry(polylineVolumeGeometry) {
        if (defined(polylineVolumeGeometry.buffer)) {
            polylineVolumeGeometry = PolylineVolumeGeometry.unpack(polylineVolumeGeometry);
        }
        polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeGeometry._ellipsoid);
        return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
    }

    return createPolylineVolumeGeometry;
});
