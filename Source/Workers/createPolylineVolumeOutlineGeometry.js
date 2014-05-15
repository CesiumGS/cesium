/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/PolylineVolumeOutlineGeometry'
    ], function(
        Ellipsoid,
        PolylineVolumeOutlineGeometry) {
    "use strict";

    function createPolylineVolumeOutlineGeometry(polylineVolumeOutlineGeometry) {
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);
        return PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
    }

    return createPolylineVolumeOutlineGeometry;
});
