/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeGeometry'
    ], function(
        Ellipsoid,
        PolylineVolumeGeometry) {
    "use strict";

    function createPolylineVolumeGeometry(polylineVolumeGeometry) {
        polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeGeometry._ellipsoid);
        return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
    }

    return createPolylineVolumeGeometry;
});
