/*global define*/
define(['../Core/PolylineVolumeOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        PolylineVolumeOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createPolylineVolumeOutlineGeometry(polylineVolumeOutlineGeometry) {
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);
        return PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
    }

    return createPolylineVolumeOutlineGeometry;
});
