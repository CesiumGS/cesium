/*global define*/
define([
        '../Core/PolylineGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PolylineGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createPolylineGeometry(parameters, transferableObjects) {
        var polylineGeometry = parameters.geometry;
        var geometry = PolylineGeometry.createGeometry(polylineGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createPolylineGeometry);
});
