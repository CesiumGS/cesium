/*global define*/
define([
        '../Core/PolylineVolumeOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        PolylineVolumeOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createPolylineVolumeOutlineGeometry(parameters, transferableObjects) {
        var polylineVolumeOutlineGeometry = parameters.geometry;
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);

        var geometry = PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createPolylineVolumeOutlineGeometry;
});
