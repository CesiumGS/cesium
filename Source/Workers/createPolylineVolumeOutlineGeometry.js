/*global define*/
define([
        '../Core/PolylineVolumeOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PolylineVolumeOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
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

    return createTaskProcessorWorker(createPolylineVolumeOutlineGeometry);
});
