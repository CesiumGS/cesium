/*global define*/
define([
        '../Core/PolylineVolumeGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        PolylineVolumeGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createPolylineVolumeGeometry(parameters, transferableObjects) {
        var polylineVolumeGeometry = parameters.geometry;
        polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeGeometry._ellipsoid);

        var geometry = PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createPolylineVolumeGeometry;
});
