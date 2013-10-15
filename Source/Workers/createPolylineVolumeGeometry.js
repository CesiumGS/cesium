/*global define*/
define([
        '../Core/PolylineVolumeGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PolylineVolumeGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
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

    return createTaskProcessorWorker(createPolylineVolumeGeometry);
});
